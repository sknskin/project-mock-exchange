import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { BalanceService } from '../../domain/services/balance.service';
import { DepositDto } from '../dto/deposit.dto';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly balanceService: BalanceService) {}

  /**
   * Deposit funds into the user's account.
   * POST /portfolio/deposit
   */
  @Post('deposit')
  async deposit(
    @Headers('x-user-id') userId: string,
    @Body() dto: DepositDto,
  ) {
    this.validateUserId(userId);
    const balance = await this.balanceService.deposit(userId, dto.amount);
    return { success: true, data: balance };
  }

  /**
   * Get user's cash balance.
   * GET /portfolio/balance
   */
  @Get('balance')
  async getBalance(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    const balance = await this.balanceService.getBalance(userId);
    return { success: true, data: balance };
  }

  /**
   * Get user's holdings.
   * GET /portfolio/holdings
   */
  @Get('holdings')
  async getHoldings(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    const holdings = await this.balanceService.getHoldings(userId);
    return { success: true, data: holdings };
  }

  /**
   * Get a full portfolio summary: balance + holdings + totals.
   * GET /portfolio/summary
   */
  @Get('summary')
  async getSummary(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    const summary = await this.balanceService.getSummary(userId);
    return { success: true, data: summary };
  }

  /**
   * Get transaction history.
   * GET /portfolio/transactions?limit=50&offset=0
   */
  @Get('transactions')
  async getTransactions(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.validateUserId(userId);

    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
      throw new BadRequestException('limit must be between 1 and 200');
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw new BadRequestException('offset must be a non-negative integer');
    }

    const transactions = await this.balanceService.getTransactions(
      userId,
      parsedLimit,
      parsedOffset,
    );

    return { success: true, data: transactions };
  }

  private validateUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException(
        'x-user-id header is required',
      );
    }
  }
}
