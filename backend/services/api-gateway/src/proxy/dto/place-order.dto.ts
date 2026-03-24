/**
 * @file 주문 생성 DTO
 * @description API Gateway 레벨에서 주문 요청 body를 검증하는 DTO
 *              프론트엔드는 quantity/price를 decimal 문자열로 전송하므로 IsString 검증 사용
 *
 * @file Place Order DTO
 * @description Validates order placement request body at API Gateway level
 *              Frontend sends quantity/price as decimal strings, so IsString validation is used
 */
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';

export class PlaceOrderDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  /** 주문 수량 (소수점 문자열) / Order quantity (decimal string) */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'quantity must be a valid decimal string' })
  quantity: string;

  @IsString()
  @IsIn(['BUY', 'SELL'])
  side: string;

  @IsString()
  @IsIn(['MARKET', 'LIMIT'])
  type: string;

  /** 주문 가격 (소수점 문자열, LIMIT 주문 시 필수) / Order price (decimal string, required for LIMIT orders) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'price must be a valid decimal string' })
  price?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  /** 트리거 가격 (소수점 문자열) / Trigger price (decimal string) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'triggerPrice must be a valid decimal string' })
  triggerPrice?: string;

  @IsOptional()
  @IsString()
  @IsIn(['STOP_LOSS', 'TAKE_PROFIT'])
  triggerType?: string;
}
