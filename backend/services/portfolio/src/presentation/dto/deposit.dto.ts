/**
 * @file 입금 DTO
 * @description 입금 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Deposit DTO
 * @description Data Transfer Object for validating deposit requests
 */
import { IsNotEmpty, IsNumber, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class DepositDto {
  /** 입금 금액 (양수, 최대 10억) / Deposit amount (positive, max 1 billion) */
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Max(1000000000, { message: 'Maximum deposit amount is 1,000,000,000' })
  @Type(() => Number)
  amount: number;
}
