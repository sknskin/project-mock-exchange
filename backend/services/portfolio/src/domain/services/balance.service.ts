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

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.marketDataUrl = this.config.get<string>(
      'MARKET_DATA_URL',
      'http://localhost:3003',
    );
  }

  /**
   * 주어진 사용자의 계좌가 존재하는지 확인하고, 없으면 생성합니다.
   *
   * Ensure an account exists for the given user, creating one if not found.
   */
  private async ensureAccount(userId: string) {
    const account = await this.prisma.account.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return account;
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

    const account = await this.ensureAccount(userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          availableCash: new Decimal(account.availableCash.toString())
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

    const account = await this.ensureAccount(userId);
    const available = new Decimal(account.availableCash.toString());

    if (available.lt(withdrawAmount)) {
      throw new BadRequestException(
        `Insufficient funds: available ${available.toFixed(2)}, requested ${withdrawAmount.toFixed(2)}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          availableCash: available.minus(withdrawAmount).toFixed(8),
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
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
        userId: string; availableCash: any; reservedCash: any;
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
          referenceId: orderId,
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const [account] = await tx.$queryRaw<Array<{
        userId: string; availableCash: any; reservedCash: any;
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
          referenceId: orderId,
        },
      });

      return updatedAccount;
    });

    this.logger.log(
      `Released ${releaseAmount.toFixed(8)} for user ${userId.substring(0, 8)}..., order ${orderId}`,
    );

    return this.toBalanceInfo(updated);
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
        userId: string; availableCash: any; reservedCash: any;
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
      const existingHolding = await tx.holding.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });

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
          referenceId: tradeId,
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
        userId: string; availableCash: any; reservedCash: any;
      }>>`SELECT "user_id" AS "userId", "available_cash" AS "availableCash", "reserved_cash" AS "reservedCash" FROM "accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;

      if (!account) {
        throw new NotFoundException(`Account not found for user ${userId}`);
      }

      const existingHolding = await tx.holding.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });

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
      // 매도 수량에 비례하여 총 비용 감소 / Reduce total cost proportionally to quantity sold
      const costReduction = existingTotalCost.mul(qty).div(existingQty);
      const newTotalCost = existingTotalCost.minus(costReduction);
      const newAvgCost = newQty.gt(0)
        ? newTotalCost.div(newQty)
        : new Decimal(0);

      const updatedHolding = await tx.holding.update({
        where: { userId_symbol: { userId, symbol } },
        data: {
          quantity: newQty.toFixed(8),
          avgCostBasis: newAvgCost.toFixed(8),
          totalCost: newTotalCost.toFixed(8),
        },
      });

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
          referenceId: tradeId,
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

    const holdingsWithPnL: HoldingWithPnL[] = holdings.map((h) => {
      const qty = new Decimal(h.quantity);
      const cost = new Decimal(h.totalCost);
      const currentPrice = priceMap.get(h.symbol) || new Decimal(h.avgCostBasis);
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
        unrealizedPnLPercent: unrealizedPnLPercent.toFixed(2),
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
      totalUnrealizedPnLPercent: totalUnrealizedPnLPercent.toFixed(2),
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
    const accounts = await this.prisma.account.findMany({
      orderBy: { availableCash: 'desc' },
      take: limit * 2, // fetch more to account for holdings
    });

    const userIds = accounts.map((a) => a.userId);

    // 배치 조회: 모든 보유 자산, 입출금 집계를 한 번에 처리 (N+1 → 4 쿼리)
    // Batch queries: fetch all holdings and deposit/withdraw aggregates at once
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
        where: { userId: { in: userIds }, type: 'WITHDRAW' },
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

    // 유저별 입출금 맵 구성 / Build deposit/withdraw maps per user
    const depositMap = new Map(depositAggs.map((d) => [d.userId, d._sum.cashDelta]));
    const withdrawMap = new Map(withdrawAggs.map((w) => [w.userId, w._sum.cashDelta]));

    const results: { userId: string; totalValue: Decimal; netDeposit: Decimal }[] = [];

    for (const account of accounts) {
      const holdings = holdingsByUser.get(account.userId) || [];

      let holdingsValue = new Decimal(0);
      for (const h of holdings) {
        const qty = new Decimal(h.quantity.toString());
        const price = priceMap.get(h.symbol) || new Decimal(h.avgCostBasis.toString());
        holdingsValue = holdingsValue.plus(qty.mul(price));
      }

      const cashTotal = new Decimal(account.availableCash.toString()).plus(
        new Decimal(account.reservedCash.toString()),
      );

      const totalDeposits = new Decimal(depositMap.get(account.userId)?.toString() || '0');
      const totalWithdraws = new Decimal(withdrawMap.get(account.userId)?.toString() || '0').abs();
      const netDeposit = totalDeposits.minus(totalWithdraws);

      results.push({
        userId: account.userId,
        totalValue: cashTotal.plus(holdingsValue),
        netDeposit,
      });
    }

    results.sort((a, b) => b.totalValue.minus(a.totalValue).toNumber());

    return results.slice(0, limit).map((r, i) => {
      const pnlPercent = r.netDeposit.gt(0)
        ? r.totalValue.minus(r.netDeposit).div(r.netDeposit).mul(100)
        : new Decimal(0);
      return {
        rank: i + 1,
        userId: r.userId,
        totalCash: r.totalValue.toFixed(8),
        totalPortfolioValue: r.totalValue.toFixed(8),
        pnlPercent: pnlPercent.toFixed(2),
      };
    });
  }

  private async fetchMarketPrices(
    symbols: string[],
  ): Promise<Map<string, Decimal>> {
    const priceMap = new Map<string, Decimal>();
    if (symbols.length === 0) return priceMap;

    try {
      const response = await axios.get(`${this.marketDataUrl}/market/prices`, {
        timeout: 5000,
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
    availableCash: any;
    reservedCash: any;
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
    quantity: any;
    avgCostBasis: any;
    totalCost: any;
    updatedAt: Date;
  }): HoldingInfo {
    return {
      id: holding.id,
      symbol: holding.symbol,
      quantity: new Decimal(holding.quantity.toString()).toFixed(8),
      avgCostBasis: new Decimal(holding.avgCostBasis.toString()).toFixed(8),
      totalCost: new Decimal(holding.totalCost.toString()).toFixed(8),
      updatedAt: holding.updatedAt,
    };
  }
}
