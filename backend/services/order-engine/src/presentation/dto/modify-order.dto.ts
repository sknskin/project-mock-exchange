/**
 * @file 주문 수정 DTO
 * @description 주문 수정 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Modify Order DTO
 * @description Data Transfer Object for validating order modification requests
 */
import { IsString, Matches } from 'class-validator';

export class ModifyOrderRequestDto {
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'price must be a valid decimal string' })
  price: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'quantity must be a valid decimal string' })
  quantity: string;
}
