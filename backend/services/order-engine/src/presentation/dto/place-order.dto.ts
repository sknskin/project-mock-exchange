/**
 * @file 주문 생성 DTO
 * @description 주문 생성 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Place Order DTO
 * @description Data Transfer Object for validating order placement requests
 */
import { IsString, IsEnum, IsOptional, IsNotEmpty, IsIn, Matches } from 'class-validator';

export class PlaceOrderRequestDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsEnum(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  @IsEnum(['MARKET', 'LIMIT'])
  type: 'MARKET' | 'LIMIT';

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'price must be a valid decimal string' })
  price?: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'quantity must be a valid decimal string' })
  quantity: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'triggerPrice must be a valid decimal string' })
  triggerPrice?: string;

  @IsOptional()
  @IsIn(['STOP_LOSS', 'TAKE_PROFIT'])
  triggerType?: string;
}
