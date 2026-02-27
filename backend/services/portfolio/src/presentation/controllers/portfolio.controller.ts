/**
 * @file 포트폴리오 컨트롤러
 * @description 잔고, 보유 자산, 입금, 리더보드 등 포트폴리오 API 엔드포인트를 처리합니다
 *
 * @file Portfolio Controller
 * @description Handles portfolio API endpoints: balance, holdings, deposit, leaderboard
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { BalanceService } from '../../domain/services/balance.service';
import { DepositDto } from '../dto/deposit.dto';
import { WithdrawDto } from '../dto/withdraw.dto';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly balanceService: BalanceService) {}

  /**
   * 사용자 계좌에 자금을 입금합니다.
   *
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
   * 사용자 계좌에서 자금을 출금합니다.
   *
   * Withdraw funds from the user's account.
   * POST /portfolio/withdraw
   */
  @Post('withdraw')
  async withdraw(
    @Headers('x-user-id') userId: string,
    @Body() dto: WithdrawDto,
  ) {
    this.validateUserId(userId);
    const balance = await this.balanceService.withdraw(userId, dto.amount);
    return { success: true, data: balance };
  }

  /**
   * 사용자의 현금 잔고를 조회합니다.
   *
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
   * 사용자의 보유 자산을 조회합니다.
   *
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
   * 전체 포트폴리오 요약 조회: 잔고 + 보유 자산 + 합계.
   *
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
   * 실시간 손익(P&L) 포함 포트폴리오 평가 조회.
   *
   * Get portfolio valuation with real-time P&L.
   * GET /portfolio/valuation
   */
  @Get('valuation')
  async getValuation(@Headers('x-user-id') userId: string) {
    this.validateUserId(userId);
    const valuation = await this.balanceService.getPortfolioValuation(userId);
    return { success: true, data: valuation };
  }

  /**
   * 상위 포트폴리오 리더보드 조회.
   *
   * Get leaderboard of top portfolios.
   * GET /portfolio/leaderboard?limit=20
   */
  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const leaderboard = await this.balanceService.getLeaderboard(parsedLimit);
    return { success: true, data: leaderboard };
  }

  /**
   * 거래 내역을 조회합니다.
   *
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
