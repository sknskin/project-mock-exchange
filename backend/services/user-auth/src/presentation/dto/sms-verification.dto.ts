/**
 * @file SMS 인증 DTO
 * @description SMS 인증 요청/응답 Data Transfer Object
 *
 * @file SMS Verification DTO
 * @description Data Transfer Object for SMS verification request/response
 */
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class SendCodeRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^01[016789]\d{7,8}$/, {
    message: 'Invalid Korean phone number format',
  })
  phone: string;
}

export class VerifyCodeRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^01[016789]\d{7,8}$/, {
    message: 'Invalid Korean phone number format',
  })
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
