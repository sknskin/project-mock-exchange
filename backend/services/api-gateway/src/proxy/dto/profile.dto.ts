/**
 * @file 프로필 프록시 DTO
 * @description API Gateway 레벨에서 프로필 관련 요청 body를 검증하는 DTO
 *
 * @file Profile Proxy DTOs
 * @description Validates profile-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

/** 프로필 수정 DTO
 * Update profile DTO */
export class UpdateProfileDto {
  /** 이름 (선택)
   * Name (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  /** 전화번호 (선택)
   * Phone number (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  /** 주소 (선택)
   * Address (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  /** 상세 주소 (선택)
   * Address detail (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressDetail?: string;

  /** 우편번호 (선택)
   * Zip code (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string;
}

/** 비밀번호 변경 DTO
 * Change password DTO */
export class ChangePasswordDto {
  /** 현재 비밀번호
   * Current password */
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  /** 새 비밀번호 (최소 8자)
   * New password (minimum 8 characters) */
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;

  /** 새 비밀번호 확인
   * Confirm new password */
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
