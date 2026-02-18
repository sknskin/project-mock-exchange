/**
 * @file 로그인 DTO
 * @description 로그인 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Login DTO
 * @description Data Transfer Object for validating login requests
 */
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  password: string;
}
