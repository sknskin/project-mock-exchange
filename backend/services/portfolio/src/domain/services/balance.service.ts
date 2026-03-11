/**
 * @file 잔고 도메인 서비스
 * @description 사용자 잔고의 예약, 해제, 정산 비즈니스 로직을 처리합니다
 *
 * @file Balance Domain Service
 * @description Handles balance reservation, release, and settlement business logic
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import Decimal from 'decimal.js';
import axios from 'axios';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUuidOrNull = (v?: string | null): string | null =>
  v && UUID_RE.test(v) ? v : null;

export interface BalanceInfo {
  userId: string;
  availableCash: string;
  reservedCash: string;
  totalCash: string;
}

export interface HoldingInfo {
  id: string;
  symbol: string;
  quantity: string;
  reservedQuantity: string;
  avgCostBasis: string;
  totalCost: string;
  updatedAt: Date;
}

export interface ReservationResult {
  reservationId: string;
  availableCash: string;
  reservedCash: string;
}

export interface HoldingWithPnL extends HoldingInfo {
  currentPrice: string;
  marketValue: string;
  unrealizedPnL: string;
  unrealizedPnLPercent: string;
}

export interface PortfolioValuation {
  balance: BalanceInfo;
  holdings: HoldingWithPnL[];
  totalCost: string;
  totalMarketValue: string;
  totalUnrealizedPnL: string;
  totalUnrealizedPnLPercent: string;
  totalRealizedPnL: string;
  totalPortfolioValue: string;
}

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);
  private readonly marketDataUrl: string;

  /** 환율 캐시 (USD → KRW)
   * Exchange rate cache */
  private cachedExchangeRate: { rate: Decimal; fetchedAt: number } | null = null;
  private static readonly EXCHANGE_RATE_TTL_MS = 10 * 60 * 1000; // 10분

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.marketDataUrl = this.config.get<string>(
      'MARKET_DATA_URL',
      'http://localhost:3001',
    );
  }

  /**
   * 심볼이 USD 기반인지 판별 / Check if symbol is USD-denominated
   * .KS 접미사 = KRW, 그 외 = USD
   */
  private isUsdSymbol(symbol: string): boolean {
    return !symbol.endsWith('.KS');
  }

  /**
   * USD → KRW 환율을 가져옵니다 (10분 캐시).
   * Fetch USD→KRW exchange rate (cached 10min).
   */
  private async getExchangeRate(): Promise<Decimal> {
    const now = Date.now();
    if (
      this.cachedExchangeRate &&
      now - this.cachedExchangeRate.fetchedAt < BalanceService.EXCHANGE_RATE_TTL_MS
    ) {
      return this.cachedExchangeRate.rate;
    }
    try {
      const { data } = await axios.get<{ rates: { KRW: number } }>(
        'https://api.frankfurter.app/latest?from=USD&to=KRW',
        { timeout: 5000 },
      );
      const rate = new Decimal(data.rates.KRW);
      this.cachedExchangeRate = { rate, fetchedAt: now };
      this.logger.log(`Fetched USD→KRW exchange rate: ${rate}`);
      return rate;
    } catch (e) {
      if (this.cachedExchangeRate) {
        this.logger.warn('Exchange rate fetch failed, using stale cache');
        return this.cachedExchangeRate.rate;
      }
      this.logger.warn('Exchange rate fetch failed, using default 1450');
      return new Decimal(1450);
    }
  }

  /**
   * 주어진 사용자의 계좌가 존재하는지 확인하고, 없으면 생성합니다.
   *
   * Ensure an account exists for the given user, creating one if not found.
   */
  /**
   * upsert를 사용하여 계정을 확인하고 없으면 생성합니다.
   * P2002(유니크 제약 조건 위반)는 동시 upsert 경쟁 조건에서 발생할 수 있으며,
   * 이 경우 기존 계정을 조회하여 반환합니다.
   *
   * Checks for an account and creates one if not found using upsert.
   * P2002 (unique constraint violation) can occur from concurrent upsert race conditions;
   * in this case, looks up and returns the existing account.
   */
  private async ensureAccount(userId: string) {
    try {
      const account = await this.prisma.account.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      return account;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const account = await this.prisma.account.findUnique({
          where: { userId },
        });
        if (account) return account;
      }
      throw error;
    }
  }

  /**
   * 사용자의 가용 현금 잔고에 자금을 입금합니다.
   *
   * Deposit funds into the user's available cash balance.
   */
  async deposit(userId: string, amount: number | string): Promise<BalanceInfo> {
    const depositAmount = new Decimal(amount);

    if (depositAmount.lte(0)) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    await this.ensureAccount(userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      // FOR UPDATE 락으로 동시 입금 Lost Update 방지
      const [locked] = await tx.$queryRaw<Array<{
        userId: string; availableCash: string; reservedCash: string;
      }>>`SELECT "user_id" AS "userId", "available_cash" AS "availableCash", "reserved_cash" AS "reservedCash" FROM "accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;

      if (!locked) throw new NotFoundException(`Account not found for user ${userId}`);

      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          availableCash: new Decimal(locked.availableCash.toString())
            .plus(depositAmount)
            .toFixed(8),
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          cashDelta: depositAmount.toFixed(8),
        },
      });

      return updatedAccount;
    });

    this.logger.log(
      `Deposited ${depositAmount.toFixed(8)} for user ${userId.substring(0, 8)}...`,
    );

    return this.toBalanceInfo(updated);
  }

  /**
   * 사용자의 가용 현금 잔고에서 자금을 출금합니다.
   *
   * Withdraw funds from the user's available cash balance.
   */
  async withdraw(userId: string, amount: number | string): Promise<BalanceInfo> {
    const withdrawAmount = new Decimal(amount);

    if (withdrawAmount.lte(0)) {
      throw new BadRequestException('Withdraw amount must be positive');
    }

    await this.ensureAccount(userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      // FOR UPDATE 락으로 동시 출금 Lost Update 방지
      const [locked] = await tx.$queryRaw<Array<{
        userId: string; availableCash: string; reservedCash: string;
      }>>`SELECT "user_id" AS "userId", "available_cash" AS "availableCash", "reserved_cash" AS "reservedCash" FROM "accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;

      if (!locked) throw new NotFoundException(`Account not found for user ${userId}`);

      const available = new Decimal(locked.availableCash.toString());
      if (available.lt(withdrawAmount)) {
        throw new BadRequestException(
          `Insufficient funds: available ${available.toFixed(2)}, requested ${withdrawAmount.toFixed(2)}`,
        );
      }

      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          availableCash: available.minus(withdrawAmount).toFixed(8),
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          cashDelta: withdrawAmount.negated().toFixed(8),
        },
      });

      return updatedAccount;
    });

    this.logger.log(
      `Withdrew ${withdrawAmount.toFixed(8)} for user ${userId.substring(0, 8)}...`,
    );

    return this.toBalanceInfo(updated);
  }

  /**
   * 주문을 위해 자금을 예약합니다. 가용 현금에서 예약 현금으로 이동합니다.
   *
   * Reserve funds for an order. Moves cash from available to reserved.
   */
  async reserveFunds(
    userId: string,
    amount: number | string,
    orderId: string,
  ): Promise<ReservationResult> {
    const reserveAmount = new Decimal(amount);

    if (reserveAmount.lte(0)) {
      throw new BadRequestException('Reserve amount must be positive');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const [account] = await tx.$queryRaw<Array<{
        userId: string; availableCash: string; reservedCash: string;
      }>>`SELECT "user_id" AS "userId", "available_cash" AS "availableCash", "reserved_cash" AS "reservedCash" FROM "accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;

      if (!account) {
        throw new BadRequestException(
          `Insufficient funds: available 0.00000000, required ${reserveAmount.toFixed(8)}`,
        );
      }

      const available = new Decimal(account.availableCash.toString());

      if (available.lt(reserveAmount)) {
        throw new BadRequestException(
          `Insufficient funds: available ${available.toFixed(8)}, required ${reserveAmount.toFixed(8)}`,
        );
      }

      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          availableCash: available.minus(reserveAmount).toFixed(8),
          reservedCash: new Decimal(account.reservedCash.toString())
            .plus(reserveAmount)
            .toFixed(8),
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'RESERVE',
          cashDelta: reserveAmount.negated().toFixed(8),
          referenceId: toUuidOrNull(orderId),
        },
      });

      return { account: updatedAccount, transaction };
    });

    this.logger.log(
      `Reserved ${reserveAmount.toFixed(8)} for user ${userId.substring(0, 8)}..., order ${orderId}`,
    );

    return {
      reservationId: result.transaction.id,
      availableCash: result.account.availableCash.toString(),
      reservedCash: result.account.reservedCash.toString(),
    };
  }

  /**
   * 이전에 예약한 자금을 가용 현금으로 해제합니다.
   *
   * Release previously reserved funds back to available cash.
   */
  async releaseFunds(
    userId: string,
    amount: number | string,
    orderId: string,
  ): Promise<BalanceInfo> {
    const releaseAmount = new Decimal(amount);

    if (releaseAmount.lte(0)) {
      throw new BadRequestException('Release amount must be positive');
    }

    // 최대 3회 재시도 로직: 일시적 DB 오류 시 자금이 영구 잠김 방지
    // Retry up to 3 times to prevent funds from being permanently locked on transient DB errors
    const MAX_RETRIES = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const updated = await this.prisma.$transaction(async (tx) => {
          const [account] = await tx.$queryRaw<Array<{
            userId: string; availableCash: string; reservedCash: string;
          }>>`SELECT "user_id" AS "userId", "available_cash" AS "availableCash", "reserved_cash" AS "reservedCash" FROM "accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;

          if (!account) {
            throw new NotFoundException(`Account not found for user ${userId}`);
          }

          const reserved = new Decimal(account.reservedCash.toString());

          if (reserved.lt(releaseAmount)) {
            throw new BadRequestException(
              `Insufficient reserved funds: reserved ${reserved.toFixed(8)}, requested release ${releaseAmount.toFixed(8)}`,
            );
          }

          const updatedAccount = await tx.account.update({
            where: { userId },
            data: {
              availableCash: new Decimal(account.availableCash.toString())
                .plus(releaseAmount)
                .toFixed(8),
              reservedCash: reserved.minus(releaseAmount).toFixed(8),
            },
          });

          await tx.transaction.create({
            data: {
              userId,
              type: 'RELEASE',
              cashDelta: releaseAmount.toFixed(8),
              referenceId: toUuidOrNull(orderId),
            },
          });

          return updatedAccount;
        });

        this.logger.log(
          `Released ${releaseAmount.toFixed(8)} for user ${userId.substring(0, 8)}..., order ${orderId}`,
        );

        return this.toBalanceInfo(updated);
      } catch (error) {
        lastError = error as Error;

        // 비즈니스 로직 오류(BadRequest, NotFound)는 재시도하지 않음
        // Do not retry business logic errors (BadRequest, NotFound)
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }

        this.logger.warn(
          `releaseFunds attempt ${attempt}/${MAX_RETRIES} failed for user ${userId.substring(0, 8)}..., order ${orderId}: ${(error as Error).message}`,
        );

        if (attempt < MAX_RETRIES) {
          // 지수 백오프: 100ms, 200ms 대기 / Exponential backoff: 100ms, 200ms
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        }
      }
    }

    this.logger.error(
      `releaseFunds failed after ${MAX_RETRIES} attempts for user ${userId.substring(0, 8)}..., order ${orderId}`,
    );
    throw lastError!;
  }

  /**
   * 매수 체결 정산: 예약 현금 차감, 가중 평균 단가로 보유 자산 추가/갱신.
   *
   * Settle a buy trade: deduct reserved cash, add/update holding with weighted average cost.
   */
  async settleBuy(
    userId: string,
    symbol: string,
    quantity: number | string,
    price: number | string,
    tradeId: string,
  ): Promise<{ balance: BalanceInfo; holding: HoldingInfo }> {
    const qty = new Decimal(quantity);
    const prc = new Decimal(price);
    const totalCost = qty.mul(prc);

    const result = await this.prisma.$transaction(async (tx) => {
      const [account] = await tx.$queryRaw<Array<{
        userId: string; availableCash: string; reservedCash: string;
      }>>`SELECT "user_id" AS "userId", "available_cash" AS "availableCash", "reserved_cash" AS "reservedCash" FROM "accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;

      if (!account) {
        throw new NotFoundException(`Account not found for user ${userId}`);
      }

      const reserved = new Decimal(account.reservedCash.toString());

      if (reserved.lt(totalCost)) {
        throw new BadRequestException(
          `Insufficient reserved funds for buy settlement: reserved ${reserved.toFixed(8)}, required ${totalCost.toFixed(8)}`,
        );
      }

      // 예약 현금 차감 / Deduct reserved cash
      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          reservedCash: reserved.minus(totalCost).toFixed(8),
        },
      });

      // 가중 평균 단가로 보유 자산 Upsert / Upsert holding with weighted average cost basis
      // FOR UPDATE 락으로 동시 체결 시 Holding 덮어쓰기 방지
      const [existingHolding] = await tx.$queryRaw<Array<{
        id: string; userId: string; symbol: string; quantity: string; avgCostBasis: string; totalCost: string;
      } | undefined>>`SELECT "id", "user_id" AS "userId", "symbol", "quantity"::text, "avg_cost_basis"::text AS "avgCostBasis", "total_cost"::text AS "totalCost" FROM "holdings" WHERE "user_id" = ${userId}::uuid AND "symbol" = ${symbol} FOR UPDATE`;

      let updatedHolding;

      if (existingHolding) {
        const existingQty = new Decimal(existingHolding.quantity.toString());
        const existingTotalCost = new Decimal(
          existingHolding.totalCost.toString(),
        );

        const newQty = existingQty.plus(qty);
        const newTotalCost = existingTotalCost.plus(totalCost);
        const newAvgCost = newQty.gt(0)
          ? newTotalCost.div(newQty)
          : new Decimal(0);

        updatedHolding = await tx.holding.update({
          where: { userId_symbol: { userId, symbol } },
          data: {
            quantity: newQty.toFixed(8),
            avgCostBasis: newAvgCost.toFixed(8),
            totalCost: newTotalCost.toFixed(8),
          },
        });
      } else {
        const avgCost = qty.gt(0) ? totalCost.div(qty) : new Decimal(0);

        updatedHolding = await tx.holding.create({
          data: {
            userId,
            symbol,
            quantity: qty.toFixed(8),
            avgCostBasis: avgCost.toFixed(8),
            totalCost: totalCost.toFixed(8),
          },
        });
      }

      // 거래 내역 기록 / Record transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'BUY',
          symbol,
          quantity: qty.toFixed(8),
          price: prc.toFixed(8),
          cashDelta: totalCost.negated().toFixed(8),
          referenceId: toUuidOrNull(tradeId),
        },
      });

      return { account: updatedAccount, holding: updatedHolding };
    });

    this.logger.log(
      `Settled BUY for user ${userId.substring(0, 8)}...: ${qty.toFixed(8)} ${symbol} @ ${prc.toFixed(8)}, trade ${tradeId}`,
    );

    return {
      balance: this.toBalanceInfo(result.account),
      holding: this.toHoldingInfo(result.holding),
    };
  }

  /**
   * 매도 체결 정산: 가용 현금에 매도 대금 추가, 보유 수량 감소.
   *
   * Settle a sell trade: add cash to available, reduce holding quantity.
   */
  async settleSell(
    userId: string,
    symbol: string,
    quantity: number | string,
    price: number | string,
    tradeId: string,
  ): Promise<{ balance: BalanceInfo; holding: HoldingInfo }> {
    const qty = new Decimal(quantity);
    const prc = new Decimal(price);
    const totalProceeds = qty.mul(prc);

    const result = await this.prisma.$transaction(async (tx) => {
      const [account] = await tx.$queryRaw<Array<{
        userId: string; availableCash: string; reservedCash: string;
      }>>`SELECT "user_id" AS "userId", "available_cash" AS "availableCash", "reserved_cash" AS "reservedCash" FROM "accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;

      if (!account) {
        throw new NotFoundException(`Account not found for user ${userId}`);
      }

      // FOR UPDATE 락으로 동시 체결 시 Holding 덮어쓰기 방지
      const [existingHolding] = await tx.$queryRaw<Array<{
        id: string; userId: string; symbol: string; quantity: string; reservedQuantity: string; avgCostBasis: string; totalCost: string;
      } | undefined>>`SELECT "id", "user_id" AS "userId", "symbol", "quantity"::text, "reserved_quantity"::text AS "reservedQuantity", "avg_cost_basis"::text AS "avgCostBasis", "total_cost"::text AS "totalCost" FROM "holdings" WHERE "user_id" = ${userId}::uuid AND "symbol" = ${symbol} FOR UPDATE`;

      if (!existingHolding) {
        throw new BadRequestException(
          `No holding found for user ${userId.substring(0, 8)}..., symbol ${symbol}`,
        );
      }

      const existingQty = new Decimal(existingHolding.quantity.toString());

      if (existingQty.lt(qty)) {
        throw new BadRequestException(
          `Insufficient holdings: available ${existingQty.toFixed(8)} ${symbol}, requested ${qty.toFixed(8)}`,
        );
      }

      // 매도 대금을 가용 현금에 추가 / Add proceeds to available cash
      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          availableCash: new Decimal(account.availableCash.toString())
            .plus(totalProceeds)
            .toFixed(8),
        },
      });

      // 보유 수량과 총 비용을 비례적으로 감소 / Reduce holding quantity and total cost proportionally
      const newQty = existingQty.minus(qty);
      const existingTotalCost = new Decimal(
        existingHolding.totalCost.toString(),
      );
      // 마지막 부분 매도 시(잔여 수량 == 매도 수량) 비례 계산 대신 잔여 비용 전체를 할당하여
      // 소수점 정밀도 손실 방지 / When selling the last remaining shares, assign the entire
      // remaining cost instead of proportional calculation to prevent precision loss
      const costReduction = newQty.isZero()
        ? existingTotalCost
        : existingTotalCost.mul(qty).div(existingQty);
      const newTotalCost = existingTotalCost.minus(costReduction);
      const newAvgCost = newQty.gt(0)
        ? newTotalCost.div(newQty)
        : new Decimal(0);

      // 매도 체결 시 예약 수량도 함께 차감 (reserved_quantity <= quantity 제약 보장)
      // Also reduce reserved quantity on sell settlement (ensures reserved_quantity <= quantity constraint)
      const existingReserved = new Decimal(existingHolding.reservedQuantity.toString());
      const newReserved = Decimal.max(existingReserved.minus(qty), new Decimal(0));

      // Prisma ORM update + raw SQL로 reserved_quantity 동시 갱신
      // Use Prisma ORM update for standard fields + raw SQL for reserved_quantity
      const updatedHolding = await tx.holding.update({
        where: { userId_symbol: { userId, symbol } },
        data: {
          quantity: newQty.toFixed(8),
          avgCostBasis: newAvgCost.toFixed(8),
          totalCost: newTotalCost.toFixed(8),
        },
      });

      // reserved_quantity는 raw SQL로 갱신 (Prisma 클라이언트 호환성 보장)
      // Update reserved_quantity via raw SQL for Prisma client compatibility
      await tx.$executeRaw`UPDATE "holdings" SET "reserved_quantity" = ${newReserved.toFixed(8)}::decimal WHERE "user_id" = ${userId}::uuid AND "symbol" = ${symbol}`;

      // 실현 손익 = 매도 대금 - 매도 비용(비례) / Realized P&L = proceeds - proportional cost
      const realizedPnl = totalProceeds.minus(costReduction);

      // 거래 내역 기록 / Record transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'SELL',
          symbol,
          quantity: qty.toFixed(8),
          price: prc.toFixed(8),
          cashDelta: totalProceeds.toFixed(8),
          realizedPnl: realizedPnl.toFixed(8),
          referenceId: toUuidOrNull(tradeId),
        },
      });

      return { account: updatedAccount, holding: updatedHolding };
    });

    this.logger.log(
      `Settled SELL for user ${userId.substring(0, 8)}...: ${qty.toFixed(8)} ${symbol} @ ${prc.toFixed(8)}, trade ${tradeId}`,
    );

    return {
      balance: this.toBalanceInfo(result.account),
      holding: this.toHoldingInfo(result.holding),
    };
  }

  /**
   * 사용자의 잔고를 조회합니다.
   *
   * Get the balance for a user.
   */
  async getBalance(userId: string): Promise<BalanceInfo> {
    const account = await this.ensureAccount(userId);
    return this.toBalanceInfo(account);
  }

  /**
   * 사용자의 모든 보유 자산을 조회합니다.
   *
   * Get all holdings for a user.
   */
  async getHoldings(userId: string): Promise<HoldingInfo[]> {
    await this.ensureAccount(userId);

    const holdings = await this.prisma.holding.findMany({
      where: { userId },
      orderBy: { symbol: 'asc' },
    });

    return holdings.map((h) => this.toHoldingInfo(h));
  }

  /**
   * 특정 심볼의 보유 자산을 조회합니다.
   *
   * Get a specific holding for a user by symbol.
   */
  async getHoldingBySymbol(userId: string, symbol: string): Promise<HoldingInfo | null> {
    const holding = await this.prisma.holding.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });
    return holding ? this.toHoldingInfo(holding) : null;
  }

  /**
   * 사용자의 모든 거래 내역을 최신순으로 조회합니다.
   *
   * Get all transactions for a user, ordered by most recent first.
   */
  async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    await this.ensureAccount(userId);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return transactions.map((t) => ({
      id: t.id,
      type: t.type,
      symbol: t.symbol,
      quantity: t.quantity?.toString() ?? null,
      price: t.price?.toString() ?? null,
      cashDelta: t.cashDelta.toString(),
      realizedPnl: t.realizedPnl?.toString() ?? null,
      referenceId: t.referenceId,
      createdAt: t.createdAt,
    }));
  }

  /**
   * 사용자 포트폴리오 요약 조회: 잔고 + 전체 보유 자산.
   *
   * Get a summary of the user's portfolio: balance + all holdings.
   */
  async getSummary(userId: string) {
    const [balance, holdings] = await Promise.all([
      this.getBalance(userId),
      this.getHoldings(userId),
    ]);

    const totalHoldingsValue = holdings.reduce(
      (sum, h) => sum.plus(new Decimal(h.totalCost)),
      new Decimal(0),
    );

    const totalPortfolioValue = new Decimal(balance.availableCash)
      .plus(new Decimal(balance.reservedCash))
      .plus(totalHoldingsValue);

    return {
      balance,
      holdings,
      totalHoldingsCost: totalHoldingsValue.toFixed(8),
      totalPortfolioValue: totalPortfolioValue.toFixed(8),
    };
  }

  /**
   * 실시간 시장 가격 기반 포트폴리오 평가 및 손익(P&L) 조회.
   *
   * Get portfolio valuation with real-time P&L using market prices.
   */
  async getPortfolioValuation(userId: string): Promise<PortfolioValuation> {
    const [balance, holdings, realizedPnlAgg] = await Promise.all([
      this.getBalance(userId),
      this.getHoldings(userId),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'SELL', realizedPnl: { not: null } },
        _sum: { realizedPnl: true },
      }),
    ]);

    const totalRealizedPnL = new Decimal(realizedPnlAgg._sum.realizedPnl?.toString() || '0');

    // 보유 종목 전체의 현재 시장 가격 조회 / Fetch current market prices for all held symbols
    const symbols = holdings.map((h) => h.symbol);
    const priceMap = await this.fetchMarketPrices(symbols);

    let totalCost = new Decimal(0);
    let totalMarketValue = new Decimal(0);

    // USD 시장가를 KRW로 변환하여 KRW 기준 totalCost와 비교
    // Convert USD market prices to KRW so they match KRW-denominated totalCost
    const exchangeRate = await this.getExchangeRate();

    const holdingsWithPnL: HoldingWithPnL[] = holdings.map((h) => {
      const qty = new Decimal(h.quantity);
      const cost = new Decimal(h.totalCost);
      const rawPrice = priceMap.get(h.symbol) || new Decimal(h.avgCostBasis);
      const currentPrice = this.isUsdSymbol(h.symbol)
        ? rawPrice.mul(exchangeRate)
        : rawPrice;
      const marketValue = qty.mul(currentPrice);
      const unrealizedPnL = marketValue.minus(cost);
      const unrealizedPnLPercent = cost.gt(0)
        ? unrealizedPnL.div(cost).mul(100)
        : new Decimal(0);

      totalCost = totalCost.plus(cost);
      totalMarketValue = totalMarketValue.plus(marketValue);

      return {
        ...h,
        currentPrice: currentPrice.toFixed(8),
        marketValue: marketValue.toFixed(8),
        unrealizedPnL: unrealizedPnL.toFixed(8),
        unrealizedPnLPercent: unrealizedPnLPercent.toFixed(3),
      };
    });

    const totalUnrealizedPnL = totalMarketValue.minus(totalCost);
    const totalUnrealizedPnLPercent = totalCost.gt(0)
      ? totalUnrealizedPnL.div(totalCost).mul(100)
      : new Decimal(0);

    const cashTotal = new Decimal(balance.availableCash).plus(
      new Decimal(balance.reservedCash),
    );
    const totalPortfolioValue = cashTotal.plus(totalMarketValue);

    return {
      balance,
      holdings: holdingsWithPnL,
      totalCost: totalCost.toFixed(8),
      totalMarketValue: totalMarketValue.toFixed(8),
      totalUnrealizedPnL: totalUnrealizedPnL.toFixed(8),
      totalUnrealizedPnLPercent: totalUnrealizedPnLPercent.toFixed(3),
      totalRealizedPnL: totalRealizedPnL.toFixed(8),
      totalPortfolioValue: totalPortfolioValue.toFixed(8),
    };
  }

  /**
   * 리더보드 조회: 총 포트폴리오 가치 기준 상위 순위.
   *
   * Get leaderboard: top portfolios ranked by total value.
   */
  async getLeaderboard(limit = 20): Promise<
    {
      rank: number;
      userId: string;
      totalCash: string;
      totalPortfolioValue: string;
      pnlPercent: string;
    }[]
  > {
    /** 전체 계좌 조회 — totalValue 기준 정렬은 보유자산 가치 포함 후 수행
     * Fetch all accounts — sort by totalValue after calculating holdings value */
    const accounts = await this.prisma.account.findMany();

    const userIds = accounts.map((a) => a.userId);

    // 배치 조회: 보유 자산, 입출금 집계, 실현 손익을 한 번에 처리
    // Batch queries: fetch holdings, deposit/withdraw aggregates, and realized P&L
    const [allHoldings, depositAggs, withdrawAggs] = await Promise.all([
      this.prisma.holding.findMany({
        where: { userId: { in: userIds } },
      }),
      this.prisma.transaction.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, type: 'DEPOSIT' },
        _sum: { cashDelta: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, type: 'WITHDRAWAL' },
        _sum: { cashDelta: true },
      }),
    ]);

    // 시장 가격 한 번에 조회 / Fetch all market prices in a single call
    const allSymbols = [...new Set(allHoldings.map((h) => h.symbol))];
    const priceMap = await this.fetchMarketPrices(allSymbols);

    // 유저별 보유 자산 맵 구성 / Build holdings map per user
    const holdingsByUser = new Map<string, typeof allHoldings>();
    for (const h of allHoldings) {
      const list = holdingsByUser.get(h.userId) || [];
      list.push(h);
      holdingsByUser.set(h.userId, list);
    }

    // 유저별 입출금/실현손익 맵 구성 / Build deposit/withdraw/realized P&L maps per user
    const depositMap = new Map(depositAggs.map((d) => [d.userId, d._sum.cashDelta]));
    const withdrawMap = new Map(withdrawAggs.map((w) => [w.userId, w._sum?.cashDelta]));

    // USD 시장가를 KRW로 변환 / Convert USD market prices to KRW
    const exchangeRate = await this.getExchangeRate();

    const results: { userId: string; totalValue: Decimal; netDeposit: Decimal }[] = [];

    for (const account of accounts) {
      const holdings = holdingsByUser.get(account.userId) || [];

      let holdingsValue = new Decimal(0);
      let holdingsCost = new Decimal(0);
      for (const h of holdings) {
        const qty = new Decimal(h.quantity.toString());
        const rawPrice = priceMap.get(h.symbol) || new Decimal(h.avgCostBasis.toString());
        const price = this.isUsdSymbol(h.symbol)
          ? rawPrice.mul(exchangeRate)
          : rawPrice;
        holdingsValue = holdingsValue.plus(qty.mul(price));
        holdingsCost = holdingsCost.plus(new Decimal(h.totalCost.toString()));
      }

      const cashTotal = new Decimal(account.availableCash.toString()).plus(
        new Decimal(account.reservedCash.toString()),
      );
      const totalValue = cashTotal.plus(holdingsValue);

      // netDeposit: 트랜잭션 기반 or 역산 (totalValue - totalPnl)
      // Use transaction-based netDeposit if available, otherwise derive from totalValue - totalPnl
      const totalDeposits = new Decimal(depositMap.get(account.userId)?.toString() || '0');
      const totalWithdraws = new Decimal(withdrawMap.get(account.userId)?.toString() || '0').abs();
      const txNetDeposit = totalDeposits.minus(totalWithdraws);

      let netDeposit: Decimal;
      if (txNetDeposit.gt(0)) {
        netDeposit = txNetDeposit;
      } else {
        // 트랜잭션 기록이 없거나 순입금이 0 이하인 경우:
        // netDeposit을 0으로 설정하여 잘못된 PnL% 계산을 방지합니다.
        // 실현 손익만 별도로 보존합니다.
        //
        // When no deposit history or net deposit <= 0:
        // Set netDeposit to zero to prevent skewed PnL%.
        // Only realized PnL is preserved separately.
        netDeposit = new Decimal(0);
      }

      results.push({
        userId: account.userId,
        totalValue,
        netDeposit,
      });
    }

    results.sort((a, b) => b.totalValue.minus(a.totalValue).toNumber());

    return results.slice(0, limit).map((r, i) => {
      // netDeposit이 0 이하인 경우 PnL%를 0으로 설정하여
      // 0 나눗셈 또는 음수 netDeposit으로 인한 왜곡 방지
      // When netDeposit is zero or negative, set PnL% to 0 to prevent
      // division-by-zero or skewed percentages from negative netDeposit
      const pnlPercent = r.netDeposit.gt(0)
        ? r.totalValue.minus(r.netDeposit).div(r.netDeposit).mul(100)
        : new Decimal(0);
      return {
        rank: i + 1,
        userId: r.userId,
        totalCash: r.totalValue.toFixed(8),
        totalPortfolioValue: r.totalValue.toFixed(8),
        pnlPercent: pnlPercent.toFixed(3),
      };
    });
  }

  /**
   * Market Data 서비스에서 전체 시장 가격을 한 번에 조회합니다.
   * N+1 쿼리를 방지하기 위해 개별 심볼이 아닌 전체 가격 목록을 가져옵니다.
   *
   * Fetches all market prices from Market Data service in a single call.
   * Avoids N+1 queries by fetching the full price list rather than individual symbols.
   */
  private async fetchMarketPrices(
    symbols: string[],
  ): Promise<Map<string, Decimal>> {
    const priceMap = new Map<string, Decimal>();
    if (symbols.length === 0) return priceMap;

    try {
      const response = await axios.get(`${this.marketDataUrl}/market/prices`, {
        timeout: 5000,
        headers: { 'x-internal-token': this.config.get('INTERNAL_SERVICE_SECRET') },
      });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        for (const tick of response.data.data) {
          if (symbols.includes(tick.symbol)) {
            priceMap.set(tick.symbol, new Decimal(tick.price));
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch market prices: ${err}`);
    }

    return priceMap;
  }

  private toBalanceInfo(account: {
    userId: string;
    availableCash: Decimal;
    reservedCash: Decimal;
  }): BalanceInfo {
    const available = new Decimal(account.availableCash.toString());
    const reserved = new Decimal(account.reservedCash.toString());

    return {
      userId: account.userId,
      availableCash: available.toFixed(8),
      reservedCash: reserved.toFixed(8),
      totalCash: available.plus(reserved).toFixed(8),
    };
  }

  private toHoldingInfo(holding: {
    id: string;
    symbol: string;
    quantity: Decimal;
    reservedQuantity?: Decimal;
    avgCostBasis: Decimal;
    totalCost: Decimal;
    updatedAt: Date;
  }): HoldingInfo {
    return {
      id: holding.id,
      symbol: holding.symbol,
      quantity: new Decimal(holding.quantity.toString()).toFixed(8),
      reservedQuantity: new Decimal((holding.reservedQuantity ?? 0).toString()).toFixed(8),
      avgCostBasis: new Decimal(holding.avgCostBasis.toString()).toFixed(8),
      totalCost: new Decimal(holding.totalCost.toString()).toFixed(8),
      updatedAt: holding.updatedAt,
    };
  }

  /**
   * 사용자 계정을 초기화합니다.
   * 모든 보유 자산과 거래 내역을 삭제하고, 현금 잔고를 초기 금액(기본 0)으로 리셋합니다.
   *
   * Reset user account.
   * Deletes all holdings and transactions, resets cash balance to initial amount (default 0).
   */
  async resetAccount(userId: string): Promise<BalanceInfo> {
    await this.ensureAccount(userId);

    // 환경변수에서 초기 잔고 설정 (기본값: 0)
    // Get initial balance from env (default: 0)
    const initialBalance = new Decimal(
      this.config.get<string>('INITIAL_BALANCE', '0'),
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      // FOR UPDATE 락으로 동시 리셋 방지 / Lock to prevent concurrent resets
      const [locked] = await tx.$queryRaw<Array<{
        userId: string; availableCash: string; reservedCash: string;
      }>>`SELECT "user_id" AS "userId", "available_cash" AS "availableCash", "reserved_cash" AS "reservedCash" FROM "accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;

      if (!locked) throw new NotFoundException(`Account not found for user ${userId}`);

      // 보유 자산 전부 삭제 / Delete all holdings
      await tx.holding.deleteMany({ where: { userId } });

      // 거래 내역 전부 삭제 / Delete all transactions
      await tx.transaction.deleteMany({ where: { userId } });

      // 현금 잔고 초기화 / Reset cash balance
      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          availableCash: initialBalance.toFixed(8),
          reservedCash: new Decimal(0).toFixed(8),
        },
      });

      // 리셋 트랜잭션 기록 (초기 잔고가 0보다 큰 경우에만)
      // Record reset transaction (only if initial balance > 0)
      if (initialBalance.gt(0)) {
        await tx.transaction.create({
          data: {
            userId,
            type: 'DEPOSIT',
            cashDelta: initialBalance.toFixed(8),
          },
        });
      }

      return updatedAccount;
    });

    this.logger.log(
      `Account reset for user ${userId.substring(0, 8)}... — balance set to ${initialBalance.toFixed(8)}`,
    );

    return this.toBalanceInfo(updated);
  }

  /**
   * 매도 주문을 위해 보유 자산을 예약합니다.
   * DB의 reserved_quantity 컬럼을 사용하여 동시 매도 주문 시 초과 예약을 방지합니다.
   *
   * Reserve holdings for a sell order.
   * Uses the DB reserved_quantity column to prevent over-reservation on concurrent sell orders.
   */
  async reserveHoldings(userId: string, symbol: string, quantity: string): Promise<{ reserved: string; available: string }> {
    const qty = new Decimal(quantity);

    const result = await this.prisma.$transaction(async (tx) => {
      const [holding] = await tx.$queryRaw<Array<{
        id: string; quantity: string; reservedQuantity: string;
      }>>`SELECT "id", "quantity"::text, "reserved_quantity"::text AS "reservedQuantity" FROM "holdings" WHERE "user_id" = ${userId}::uuid AND "symbol" = ${symbol} FOR UPDATE`;

      if (!holding) {
        throw new BadRequestException(`No holding found for symbol ${symbol}`);
      }

      const totalQty = new Decimal(holding.quantity);
      const reserved = new Decimal(holding.reservedQuantity);
      const available = totalQty.minus(reserved);

      if (available.lt(qty)) {
        throw new BadRequestException(
          `Insufficient holdings: available ${available.toFixed(8)} ${symbol}, requested ${qty.toFixed(8)}`,
        );
      }

      await tx.$executeRaw`UPDATE "holdings" SET "reserved_quantity" = "reserved_quantity" + ${qty.toFixed(8)}::decimal, "updated_at" = NOW() WHERE "id" = ${holding.id}::uuid`;

      return {
        reserved: reserved.plus(qty).toFixed(8),
        available: available.minus(qty).toFixed(8),
      };
    });

    this.logger.log(
      `Reserved holdings for user ${userId.substring(0, 8)}...: ${qty.toFixed(8)} ${symbol} (reserved: ${result.reserved}, available: ${result.available})`,
    );

    return result;
  }

  /**
   * 매도 주문 취소 시 예약된 보유 자산을 해제합니다.
   * 요청 수량이 현재 예약 수량보다 크면 예약된 만큼만 해제합니다.
   *
   * Release reserved holdings when a sell order is cancelled.
   * If requested quantity exceeds current reserved, only the reserved amount is released.
   */
  async releaseHoldings(userId: string, symbol: string, quantity: string): Promise<{ reserved: string; released: string }> {
    const qty = new Decimal(quantity);

    const result = await this.prisma.$transaction(async (tx) => {
      const [holding] = await tx.$queryRaw<Array<{
        id: string; reservedQuantity: string;
      }>>`SELECT "id", "reserved_quantity"::text AS "reservedQuantity" FROM "holdings" WHERE "user_id" = ${userId}::uuid AND "symbol" = ${symbol} FOR UPDATE`;

      if (!holding) {
        throw new BadRequestException(`No holding found for symbol ${symbol}`);
      }

      const reserved = new Decimal(holding.reservedQuantity);
      const releaseQty = Decimal.min(qty, reserved);

      await tx.$executeRaw`UPDATE "holdings" SET "reserved_quantity" = "reserved_quantity" - ${releaseQty.toFixed(8)}::decimal, "updated_at" = NOW() WHERE "id" = ${holding.id}::uuid`;

      return {
        reserved: reserved.minus(releaseQty).toFixed(8),
        released: releaseQty.toFixed(8),
      };
    });

    this.logger.log(
      `Released holdings for user ${userId.substring(0, 8)}...: ${result.released} ${symbol} (remaining reserved: ${result.reserved})`,
    );

    return result;
  }
}
