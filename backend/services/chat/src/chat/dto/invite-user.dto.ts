/**
 * @file 사용자 초대 DTO
 * @description 채팅방에 사용자를 초대하는 요청의 유효성을 검증합니다.
 *              UUID v4 형식의 사용자 ID 배열을 받습니다.
 *
 * @file Invite User DTO
 * @description Validates requests to invite users to a chat room.
 *              Accepts an array of UUID v4 user IDs.
 */
import { IsArray, IsUUID } from 'class-validator';

export class InviteUserDto {
  // 초대할 사용자 ID 목록 (UUID v4) / User IDs to invite (UUID v4)
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];
}
