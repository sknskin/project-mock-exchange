/**
 * @file 메시지 전송 DTO
 * @description 채팅 메시지 전송 요청의 유효성을 검증합니다. 최대 2000자.
 *
 * @file Send Message DTO
 * @description Validates chat message send requests. Max 2000 characters.
 */
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  // 메시지 내용: 1~2000자 / Message content: 1-2000 characters
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
