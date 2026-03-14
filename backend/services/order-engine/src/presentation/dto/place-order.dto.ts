/**
 * @file 주문 생성 DTO
 * @description 주문 생성 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Place Order DTO
 * @description Data Transfer Object for validating order placement requests
 */
import { IsString, IsEnum, IsOptional, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export enum TriggerType {
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
}

export class PlaceOrderRequestDto {
  /** 거래 종목 심볼 (예: 'BTC-USD', 'AAPL') / Trading pair symbol (e.g., 'BTC-USD', 'AAPL') */
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Z0-9]{1,10}([.-][A-Z]{1,4})?(-USD)?$/, { message: 'symbol must be a valid trading pair (e.g., BTC-USD, AAPL, BRK.B)' })
  symbol: string;

  /** 매수/매도 구분 / Buy or sell side */
  @IsEnum(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  /** 주문 유형: 시장가 또는 지정가 / Order type: market or limit */
  @IsEnum(['MARKET', 'LIMIT'])
  type: 'MARKET' | 'LIMIT';

  /** 지정가 주문 시 희망 가격 (문자열, 선택) / Desired price for limit orders (string, optional) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'price must be a valid positive decimal string' })
  @Matches(/^(?!0+(\.0+)?$)/, { message: 'price must be greater than zero' })
  price?: string;

  /** 주문 수량 (문자열) / Order quantity (string) */
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'quantity must be a valid positive decimal string' })
  @Matches(/^(?!0+(\.0+)?$)/, { message: 'quantity must be greater than zero' })
  quantity: string;

  /** 멱등성 키 — 중복 주문 방지용 / Idempotency key — prevents duplicate orders */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey: string;

  /** 조건부 주문 트리거 가격 (선택) / Conditional order trigger price (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'triggerPrice must be a valid positive decimal string' })
  @Matches(/^(?!0+(\.0+)?$)/, { message: 'triggerPrice must be greater than zero' })
  triggerPrice?: string;

  /** 트리거 유형: 손절 또는 익절 (선택) / Trigger type: stop-loss or take-profit (optional) */
  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;
}
