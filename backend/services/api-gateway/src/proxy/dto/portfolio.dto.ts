/**
 * @file 포트폴리오 프록시 DTO
 * @description API Gateway 레벨에서 포트폴리오 관련 요청 body를 검증하는 DTO
 *
 * @file Portfolio Proxy DTOs
 * @description Validates portfolio-related request bodies at API Gateway level
 */
import {
  IsNumber,
  IsPositive,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 입금 DTO
 * Deposit DTO */
export class DepositDto {
  /** 입금 금액 (최대 10억)
   * Deposit amount (max 1 billion) */
  @IsNumber()
  @IsPositive()
  @Max(1000000000)
  @Type(() => Number)
  amount: number;
}

/** 출금 DTO
 * Withdraw DTO */
export class WithdrawDto {
  /** 출금 금액 (최대 10억)
   * Withdrawal amount (max 1 billion) */
  @IsNumber()
  @IsPositive()
  @Max(1000000000)
  @Type(() => Number)
  amount: number;
}
