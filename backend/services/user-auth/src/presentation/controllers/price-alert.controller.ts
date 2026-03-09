/**
 * @file 가격 알림 컨트롤러
 * @description 가격 알림 CRUD 및 트리거 처리
 *
 * @file Price Alert Controller
 * @description Price alert CRUD and trigger handling
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { UserDto } from '@virtuex/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

enum AlertConditionDto {
  ABOVE = 'ABOVE',
  BELOW = 'BELOW',
}

class CreatePriceAlertDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  targetPrice: number;

  @IsEnum(AlertConditionDto)
  condition: AlertConditionDto;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  displayTargetPrice?: number;
}

@Controller('price-alerts')
@UseGuards(InternalAuthGuard)
export class PriceAlertController {
  constructor(private readonly prisma: PrismaService) {}

  /** 가격 알림 생성 (최대 20개) / Create price alert (max 20 active) */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: UserDto,
    @Body() dto: CreatePriceAlertDto,
  ) {
    const activeCount = await this.prisma.priceAlert.count({
      where: { userId: user.id, isActive: true },
    });
    if (activeCount >= 20) {
      throw new BadRequestException('Maximum 20 active alerts allowed');
    }

    const alert = await this.prisma.priceAlert.create({
      data: {
        userId: user.id,
        symbol: dto.symbol,
        targetPrice: dto.targetPrice,
        condition: dto.condition,
        currency: dto.currency || 'USD',
        displayTargetPrice: dto.displayTargetPrice ?? null,
      },
    });

    return { success: true, data: alert };
  }

  /** 내 가격 알림 목록 조회 (심볼 필터 가능) / List my price alerts (optional symbol filter) */
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @CurrentUser() user: UserDto,
    @Query('symbol') symbol?: string,
  ) {
    const where: Record<string, unknown> = { userId: user.id };
    if (symbol) where.symbol = symbol;

    const items = await this.prisma.priceAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: { items } };
  }

  /** 전체 활성 가격 알림 조회 (내부 서비스용) / List all active price alerts (for internal services) */
  @Get('active')
  async listActive() {
    const items = await this.prisma.priceAlert.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        symbol: true,
        targetPrice: true,
        condition: true,
        currency: true,
        displayTargetPrice: true,
      },
    });
    return { success: true, data: { items } };
  }

  /** 가격 알림 삭제 / Delete price alert */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    await this.prisma.priceAlert.deleteMany({
      where: { id, userId: user.id },
    });
    return { success: true };
  }

  /** 가격 알림 트리거 처리 — 비활성화 및 트리거 시간 기록 / Trigger price alert — deactivate and record trigger time */
  @Post(':id/trigger')
  async trigger(@Param('id') id: string) {
    await this.prisma.priceAlert.update({
      where: { id },
      data: { isActive: false, triggeredAt: new Date() },
    });
    return { success: true };
  }
}
