/**
 * @file 인증 프록시 DTO
 * @description API Gateway에서 인증 관련 요청 body를 타입 안전하게 검증하는 DTO
 *
 * @file Auth Proxy DTOs
 * @description Type-safe DTOs for validating auth-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

/** VAL-L-01: 로그인 요청 DTO
 * VAL-L-01: Login request DTO */
export class LoginDto {
  /** 이메일 또는 아이디
   * Email or username */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;

  /** 비밀번호
   * Password */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}

/** VAL-L-01: 회원가입 요청 DTO
 * VAL-L-01: Register request DTO */
export class RegisterDto {
  /** 이메일
   * Email address */
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  /** 아이디
   * Username */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  /** 비밀번호 — 최소 8자
   * Password — minimum 8 characters */
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  /** 이름
   * Full name */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  /** 전화번호 (선택)
   * Phone number (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  /** SMS 인증 세션 ID
   * SMS verification session ID */
  @IsOptional()
  @IsString()
  smsSessionId?: string;
}

/** VAL-L-01: 로그인 SMS 인증 요청 DTO
 * VAL-L-01: Login SMS verification request DTO */
export class VerifySmsDto {
  /** SMS 인증 세션 ID
   * SMS verification session ID */
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  /** SMS 인증번호 (6자리)
   * SMS verification code (6 digits) */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}

/** VAL-L-01: SMS 발송 요청 DTO
 * VAL-L-01: SMS send request DTO */
export class SendSmsDto {
  /** 전화번호 (선택)
   * Phone number (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

/** VAL-L-01: SMS 재전송 요청 DTO
 * VAL-L-01: SMS resend request DTO */
export class ResendSmsDto {
  /** SMS 인증 세션 ID
   * SMS verification session ID */
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

/** VAL-L-01: 비밀번호 찾기 요청 DTO
 * VAL-L-01: Forgot password request DTO */
export class ForgotPasswordDto {
  /** 이메일 또는 아이디
   * Email or username */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;
}

/** VAL-L-01: 비밀번호 재설정 요청 DTO
 * VAL-L-01: Reset password request DTO */
export class ResetPasswordDto {
  /** SMS 인증 세션 ID
   * SMS verification session ID */
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  /** 새 비밀번호
   * New password */
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

/** VAL-L-01: TOTP 코드 검증 DTO
 * VAL-L-01: TOTP code verification DTO */
export class TotpCodeDto {
  /** TOTP 코드 (6자리)
   * TOTP code (6 digits) */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}
