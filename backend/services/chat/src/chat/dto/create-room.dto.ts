/**
 * @file 채팅방 생성 DTO
 * @description 채팅방 생성 요청의 유효성을 검증하는 Data Transfer Object.
 *              DM(1:1) 또는 GROUP(그룹) 타입을 지원합니다.
 *
 * @file Create Room DTO
 * @description Data Transfer Object for validating room creation requests.
 *              Supports DM (1:1) or GROUP types.
 */
import { IsEnum, IsOptional, IsString, IsArray, IsUUID, MaxLength } from 'class-validator';

// 채팅방 타입: DM(1:1 대화) 또는 GROUP(그룹 대화) / Room type: DM (1:1 chat) or GROUP (group chat)
export enum RoomTypeDto {
  DM = 'DM',
  GROUP = 'GROUP',
}

export class CreateRoomDto {
  @IsEnum(RoomTypeDto)
  type: RoomTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];
}
