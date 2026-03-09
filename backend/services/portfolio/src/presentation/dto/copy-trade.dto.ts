/**
 * @file 카피 트레이딩 DTO
 * @description 카피 트레이딩 설정 및 업데이트 요청의 유효성을 검증하는 Data Transfer Objects
 *
 * @file Copy Trading DTOs
 * @description Data Transfer Objects for validating copy trading config and update requests
 */
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class StartCopyTradeDto {
  /** 카피 트레이딩 대상 트레이더 ID
   * Target trader ID for copy trading */
  @IsString()
  @IsNotEmpty()
  traderId: string;

  /** 거래량 비율 (0.01 ~ 10.0)
   * Scale ratio for trade quantity (0.01 ~ 10.0) */
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(10.0)
  @Type(() => Number)
  scaleRatio: number;

  /** 최대 투자 금액
   * Maximum investment amount */
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxInvestment: number;

  /** 손절 비율 (선택, 0.01 ~ 100.00)
   * Stop loss percentage (optional, 0.01 ~ 100.00) */
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(100.0)
  @IsOptional()
  @Type(() => Number)
  stopLossPercent?: number;
}

export class UpdateCopyTradeDto {
  /** 거래량 비율 (선택, 0.01 ~ 10.0)
   * Scale ratio for trade quantity (optional, 0.01 ~ 10.0) */
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(10.0)
  @IsOptional()
  @Type(() => Number)
  scaleRatio?: number;

  /** 최대 투자 금액 (선택)
   * Maximum investment amount (optional) */
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  maxInvestment?: number;

  /** 손절 비율 (선택, 0.01 ~ 100.00)
   * Stop loss percentage (optional, 0.01 ~ 100.00) */
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(100.0)
  @IsOptional()
  @Type(() => Number)
  stopLossPercent?: number;
}
