/**
 * @file 가격 알림 프록시 DTO
 * @description API Gateway 레벨에서 가격 알림 관련 요청 body를 검증하는 DTO
 *
 * @file Price Alert Proxy DTOs
 * @description Validates price alert-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 가격 알림 생성 DTO
 * Create price alert DTO */
export class CreatePriceAlertDto {
  /** 종목 심볼
   * Stock/crypto symbol */
  @IsString()
  @IsNotEmpty()
  symbol: string;

  /** 목표 가격
   * Target price */
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  targetPrice: number;

  /** 알림 조건 (이상/이하)
   * Alert condition (above/below) */
  @IsString()
  @IsIn(['ABOVE', 'BELOW'])
  condition: string;

  /** 통화 (선택)
   * Currency (optional) */
  @IsOptional()
  @IsString()
  currency?: string;

  /** 화면 표시용 목표 가격 (선택)
   * Display target price for UI (optional) */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayTargetPrice?: number;
}
