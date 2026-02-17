import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import Decimal from 'decimal.js';

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

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure an account exists for the given user, creating one if not found.
   */
  private async ensureAccount(userId: string) {
    let account = await this.prisma.account.findUnique({
      where: { userId },
    });

    if (!account) {
      account = await this.prisma.account.create({
        data: { userId },
      });
      this.logger.log(`Created new account for user ${userId}`);
    }

    return account;
  }

  /**
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
      `Deposited ${depositAmount.toFixed(8)} for user ${userId}`,
    );

    return this.toBalanceInfo(updated);
  }

  /**
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

    const account = await this.prisma.account.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundException(`Account not found for user ${userId}`);
    }

    const available = new Decimal(account.availableCash.toString());

    if (available.lt(reserveAmount)) {
      throw new BadRequestException(
        `Insufficient funds: available ${available.toFixed(8)}, required ${reserveAmount.toFixed(8)}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
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
      `Reserved ${reserveAmount.toFixed(8)} for user ${userId}, order ${orderId}`,
    );

    return {
      reservationId: result.transaction.id,
      availableCash: result.account.availableCash.toString(),
      reservedCash: result.account.reservedCash.toString(),
    };
  }

  /**
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

    const account = await this.prisma.account.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundException(`Account not found for user ${userId}`);
    }

    const reserved = new Decimal(account.reservedCash.toString());

    if (reserved.lt(releaseAmount)) {
      throw new BadRequestException(
        `Insufficient reserved funds: reserved ${reserved.toFixed(8)}, requested release ${releaseAmount.toFixed(8)}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
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
      `Released ${releaseAmount.toFixed(8)} for user ${userId}, order ${orderId}`,
    );

    return this.toBalanceInfo(updated);
  }

  /**
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

    const account = await this.prisma.account.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundException(`Account not found for user ${userId}`);
    }

    const reserved = new Decimal(account.reservedCash.toString());

    if (reserved.lt(totalCost)) {
      throw new BadRequestException(
        `Insufficient reserved funds for buy settlement: reserved ${reserved.toFixed(8)}, required ${totalCost.toFixed(8)}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct reserved cash
      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          reservedCash: reserved.minus(totalCost).toFixed(8),
        },
      });

      // Upsert holding with weighted average cost basis
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

      // Record transaction
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
      `Settled BUY for user ${userId}: ${qty.toFixed(8)} ${symbol} @ ${prc.toFixed(8)}, trade ${tradeId}`,
    );

    return {
      balance: this.toBalanceInfo(result.account),
      holding: this.toHoldingInfo(result.holding),
    };
  }

  /**
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

    const account = await this.prisma.account.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundException(`Account not found for user ${userId}`);
    }

    const existingHolding = await this.prisma.holding.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });

    if (!existingHolding) {
      throw new BadRequestException(
        `No holding found for user ${userId}, symbol ${symbol}`,
      );
    }

    const existingQty = new Decimal(existingHolding.quantity.toString());

    if (existingQty.lt(qty)) {
      throw new BadRequestException(
        `Insufficient holdings: available ${existingQty.toFixed(8)} ${symbol}, requested ${qty.toFixed(8)}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Add proceeds to available cash
      const updatedAccount = await tx.account.update({
        where: { userId },
        data: {
          availableCash: new Decimal(account.availableCash.toString())
            .plus(totalProceeds)
            .toFixed(8),
        },
      });

      // Reduce holding quantity and total cost proportionally
      const newQty = existingQty.minus(qty);
      const existingTotalCost = new Decimal(
        existingHolding.totalCost.toString(),
      );
      // Reduce total cost proportionally to quantity sold
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

      // Record transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'SELL',
          symbol,
          quantity: qty.toFixed(8),
          price: prc.toFixed(8),
          cashDelta: totalProceeds.toFixed(8),
          referenceId: tradeId,
        },
      });

      return { account: updatedAccount, holding: updatedHolding };
    });

    this.logger.log(
      `Settled SELL for user ${userId}: ${qty.toFixed(8)} ${symbol} @ ${prc.toFixed(8)}, trade ${tradeId}`,
    );

    return {
      balance: this.toBalanceInfo(result.account),
      holding: this.toHoldingInfo(result.holding),
    };
  }

  /**
   * Get the balance for a user.
   */
  async getBalance(userId: string): Promise<BalanceInfo> {
    const account = await this.ensureAccount(userId);
    return this.toBalanceInfo(account);
  }

  /**
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
      referenceId: t.referenceId,
      createdAt: t.createdAt,
    }));
  }

  /**
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
