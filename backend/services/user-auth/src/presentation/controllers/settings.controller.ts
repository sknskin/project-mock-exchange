import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from '../../application/services/settings.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

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
