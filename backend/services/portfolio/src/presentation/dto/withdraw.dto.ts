/**
 * @file 출금 DTO
 * @description 출금 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Withdraw DTO
 * @description Data Transfer Object for validating withdraw requests
 */
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class WithdrawDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;
}
