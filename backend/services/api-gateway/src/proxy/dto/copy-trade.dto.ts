/**
 * @file 카피 트레이딩 프록시 DTO
 * @description API Gateway 레벨에서 카피 트레이딩 관련 요청 body를 검증하는 DTO
 *
 * @file Copy Trade Proxy DTOs
 * @description Validates copy trading-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 카피 트레이딩 시작 DTO
 * Start copy trading DTO */
export class StartCopyTradeDto {
  /** 대상 트레이더 ID
   * Target trader ID */
  @IsString()
  @IsNotEmpty()
  traderId: string;

  /** 비율 배수 (0.01 ~ 10)
   * Scale ratio (0.01 ~ 10) */
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(10)
  @Type(() => Number)
  scaleRatio: number;

  /** 최대 투자 금액
   * Maximum investment amount */
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxInvestment: number;

  /** 손절 퍼센트 (0.01 ~ 100, 선택)
   * Stop loss percentage (0.01 ~ 100, optional) */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100)
  @Type(() => Number)
  stopLossPercent?: number;
}

/** 카피 트레이딩 설정 수정 DTO
 * Update copy trade config DTO */
export class UpdateCopyTradeDto {
  /** 비율 배수 (0.01 ~ 10, 선택)
   * Scale ratio (0.01 ~ 10, optional) */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(10)
  @Type(() => Number)
  scaleRatio?: number;

  /** 최대 투자 금액 (선택)
   * Maximum investment amount (optional) */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxInvestment?: number;

  /** 손절 퍼센트 (0.01 ~ 100, 선택)
   * Stop loss percentage (0.01 ~ 100, optional) */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100)
  @Type(() => Number)
  stopLossPercent?: number;
}
