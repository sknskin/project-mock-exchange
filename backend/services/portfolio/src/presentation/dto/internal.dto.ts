/**
 * @file 내부 API DTO
 * @description 내부 서비스 간 통신 요청의 유효성을 검증하는 Data Transfer Objects
 *
 * @file Internal API DTOs
 * @description Data Transfer Objects for validating inter-service communication requests
 */
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

const SYMBOL_PATTERN = /^[A-Z0-9]{2,10}([.-][A-Z]{1,4})?(-USD)?$/;

export class ReserveFundsDto {
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  orderId?: string;
}

export class ReleaseFundsDto {
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;
}

export class SettleTradeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(SYMBOL_PATTERN, { message: 'Invalid symbol format' })
  symbol: string;

  @IsString()
  @IsNotEmpty()
  quantity: string;

  @IsString()
  @IsNotEmpty()
  price: string;

  @IsString()
  @IsNotEmpty()
  tradeId: string;
}

export class ReserveHoldingsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(SYMBOL_PATTERN, { message: 'Invalid symbol format' })
  symbol: string;

  @IsString()
  @IsNotEmpty()
  quantity: string;
}

export class ReleaseHoldingsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(SYMBOL_PATTERN, { message: 'Invalid symbol format' })
  symbol: string;

  @IsString()
  @IsNotEmpty()
  quantity: string;

  @IsString()
  @IsOptional()
  orderId?: string;
}
