/**
 * @file 채팅 기능 모듈
 * @description 채팅 컨트롤러와 서비스를 등록합니다. ChatService를 export하여 다른 모듈에서 사용 가능합니다.
 *
 * @file Chat Feature Module
 * @description Registers chat controller and service. Exports ChatService for use by other modules.
 */
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DataRetentionService } from './data-retention.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, DataRetentionService],
  exports: [ChatService],
})
export class ChatModule {}
