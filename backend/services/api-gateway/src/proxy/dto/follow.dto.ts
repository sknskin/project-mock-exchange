/**
 * @file 팔로우 프록시 DTO
 * @description API Gateway 레벨에서 팔로우 관련 요청 body를 검증하는 DTO
 *
 * @file Follow Proxy DTOs
 * @description Validates follow-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';

/** 팔로우 배치 카운트 DTO
 * Follow batch counts DTO */
export class BatchFollowCountsDto {
  /** 사용자 ID 목록 (최대 100개)
   * List of user IDs (max 100) */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  userIds: string[];
}

/** 알림 모드 변경 DTO
 * Update notify mode DTO */
export class UpdateNotifyModeDto {
  /** 알림 모드
   * Notification mode */
  @IsString()
  @IsNotEmpty()
  @IsIn(['ALL', 'BUY_ONLY', 'SELL_ONLY', 'OFF'])
  notifyMode: string;
}
