/**
 * @file 비밀번호 찾기 DTO
 * @description 비밀번호 재설정 흐름의 3단계 (요청, SMS 인증, 재설정)에 사용되는 DTO들
 *
 * @file Forgot Password DTOs
 * @description DTOs for the 3-step password reset flow (request, SMS verify, reset)
 */
import { IsString, IsNotEmpty, Length, MinLength, MaxLength, Matches } from 'class-validator';

// 1단계: 이메일 또는 아이디로 비밀번호 재설정 요청 / Step 1: Request password reset with email or username
export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

// 2단계: SMS 인증코드 검증 / Step 2: Verify SMS code
export class ForgotPasswordVerifySmsDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

// 3단계: 새 비밀번호 설정 — 기존과 동일한 비밀번호 정책 적용 / Step 3: Set new password — same password policy as registration
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])/, { message: 'Password must contain a lowercase letter' })
  @Matches(/(?=.*\d)/, { message: 'Password must contain a number' })
  @Matches(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, { message: 'Password must contain a special character' })
  newPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword: string;
}
