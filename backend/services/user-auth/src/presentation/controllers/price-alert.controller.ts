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
import { IsString, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';

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
}

@Controller('price-alerts')
@UseGuards(JwtAuthGuard)
export class PriceAlertController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
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
      },
    });

    return { success: true, data: alert };
  }

  @Get()
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
      },
    });
    return { success: true, data: { items } };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    await this.prisma.priceAlert.deleteMany({
      where: { id, userId: user.id },
    });
    return { success: true };
  }

  @Post(':id/trigger')
  async trigger(@Param('id') id: string) {
    await this.prisma.priceAlert.update({
      where: { id },
      data: { isActive: false, triggeredAt: new Date() },
    });
    return { success: true };
  }
}
