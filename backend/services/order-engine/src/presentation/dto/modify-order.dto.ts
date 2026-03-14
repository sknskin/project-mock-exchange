/**
 * @file 주문 수정 DTO
 * @description 주문 수정 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Modify Order DTO
 * @description Data Transfer Object for validating order modification requests
 */
import { IsString, Matches, MaxLength } from 'class-validator';

export class ModifyOrderRequestDto {
  /** 변경할 주문 가격 (문자열) / New order price (string) */
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'price must be a valid decimal string' })
  price: string;

  /** 변경할 주문 수량 (문자열) / New order quantity (string) */
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'quantity must be a valid decimal string' })
  quantity: string;
}
