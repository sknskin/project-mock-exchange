/**
 * @file 로그인 SMS 인증 DTO
 * @description 로그인 2단계 SMS 인증을 위한 Data Transfer Object
 *
 * @file Login SMS Verification DTO
 * @description Data Transfer Object for login step 2 SMS verification
 */
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyLoginSmsDto {
  // 로그인 1단계에서 발급된 세션 ID / Session ID issued from login step 1
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
