/**
 * @file 출금 DTO
 * @description 출금 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Withdraw DTO
 * @description Data Transfer Object for validating withdraw requests
 */
import { IsNotEmpty, IsNumber, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class WithdrawDto {
  /** 출금 금액 (양수, 최대 10억) / Withdrawal amount (positive, max 1 billion) */
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Max(1000000000, { message: 'Maximum withdrawal amount is 1,000,000,000' })
  @Type(() => Number)
  amount: number;
}
