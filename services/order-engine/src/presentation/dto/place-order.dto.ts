import { IsString, IsEnum, IsOptional, IsNotEmpty, Matches } from 'class-validator';

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
}
