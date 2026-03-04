/**
 * @file 채팅방 이름 변경 DTO
 * @description 그룹 채팅방 이름 변경 요청의 유효성을 검증합니다. 1~100자.
 *
 * @file Rename Room DTO
 * @description Validates group room rename requests. 1-100 characters.
 */
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RenameRoomDto {
  // 새 채팅방 이름: 1~100자 / New room name: 1-100 characters
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
