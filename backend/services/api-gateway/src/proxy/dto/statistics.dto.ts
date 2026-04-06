/**
 * @file 통계 프록시 DTO
 * @description API Gateway 레벨에서 통계 관련 요청 body를 검증하는 DTO
 *
 * @file Statistics Proxy DTOs
 * @description Validates statistics-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

/** 페이지 뷰 추적 DTO
 * Track page view DTO */
export class TrackPageViewDto {
  /** 페이지 경로
   * Page path */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  path: string;

  /** 사용자 ID (선택)
   * User ID (optional) */
  @IsOptional()
  @IsString()
  userId?: string;
}
