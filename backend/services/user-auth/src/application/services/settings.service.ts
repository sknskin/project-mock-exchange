import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 전체 시스템 설정을 키-값 객체로 조회
   * Get all system settings as key-value object */
  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.systemSetting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  /** 시스템 설정 일괄 upsert (트랜잭션)
   * Bulk upsert system settings in a transaction */
  async bulkUpdate(data: Record<string, string>): Promise<Record<string, string>> {
    const entries = Object.entries(data);

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );

    this.logger.log(`System settings updated: ${entries.map(([k]) => k).join(', ')}`);
    return this.getAll();
  }
}
