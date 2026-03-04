/**
 * @file 시스템 설정 컨트롤러
 * @description 시스템 전역 설정(키-값 쌍)의 조회/일괄 수정 API
 *
 * @file System Settings Controller
 * @description API for querying/bulk-updating system-wide settings (key-value pairs)
 */
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from '../../application/services/settings.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

// 내부 서비스 전용 — API Gateway를 통해서만 접근 / Internal only — accessible via API Gateway
@UseGuards(InternalAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAll() {
    const settings = await this.settingsService.getAll();
    return { success: true, data: settings };
  }

  @Put()
  async bulkUpdate(@Body() body: Record<string, string>) {
    const settings = await this.settingsService.bulkUpdate(body);
    return { success: true, data: settings };
  }
}
