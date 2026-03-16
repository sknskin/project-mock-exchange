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
} from 'class-validator';

export class PlaceOrderDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  quantity: string;

  @IsString()
  @IsIn(['BUY', 'SELL'])
  side: string;

  @IsString()
  @IsIn(['MARKET', 'LIMIT'])
  type: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  triggerPrice?: string;

  @IsOptional()
  @IsString()
  @IsIn(['STOP_LOSS', 'TAKE_PROFIT'])
  triggerType?: string;
}
