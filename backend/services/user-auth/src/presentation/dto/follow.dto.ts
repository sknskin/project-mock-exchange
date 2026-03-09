/**
 * @file 팔로우 DTO
 * @description 팔로우 알림 모드 변경 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Follow DTOs
 * @description Data Transfer Object for validating follow notification mode update requests
 */
import { IsString, IsIn } from 'class-validator';

export class UpdateNotifyModeDto {
  // 알림 모드: ALL(전체), BUY_ONLY(매수만), SELL_ONLY(매도만), OFF(끄기)
  // Notify mode: ALL, BUY_ONLY, SELL_ONLY, or OFF
  @IsString()
  @IsIn(['ALL', 'BUY_ONLY', 'SELL_ONLY', 'OFF'])
  notifyMode: string;
}
