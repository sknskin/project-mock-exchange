/**
 * @file 주문 수정 DTO
 * @description API Gateway 레벨에서 주문 수정 요청 body를 검증하는 DTO
 *
 * @file Modify Order DTO
 * @description Validates order modification request body at API Gateway level
 */
import {
  IsString,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';

export class ModifyOrderDto {
  /** 변경할 주문 가격 (문자열) / New order price (string) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'price must be a valid decimal string' })
  price?: string;

  /** 변경할 주문 수량 (문자열) / New order quantity (string) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?$/, { message: 'quantity must be a valid decimal string' })
  quantity?: string;
}
