import { IsString, Matches } from 'class-validator';

export class ModifyOrderRequestDto {
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'price must be a valid decimal string' })
  price: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'quantity must be a valid decimal string' })
  quantity: string;
}
