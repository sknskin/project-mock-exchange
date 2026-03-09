/**
 * @file 활동 피드 컨트롤러
 * @description 트레이더 활동 피드 조회 및 공개 설정 API
 *
 * @file Activity Feed Controller
 * @description API for trader activity feed retrieval and visibility settings
 */
import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Headers,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ActivityService } from '../../domain/services/activity.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('portfolio')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /** 팔로잉 중인 트레이더들의 활동 피드를 조회합니다
   * Get activity feed for followed traders */
  @Get('feed')
  async getFeed(
    @Headers('x-user-id') userId: string,
    @Query('followingIds') followingIds: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.validateUserId(userId);

    const ids = followingIds
      ? followingIds.split(',').filter((id) => id.trim())
      : [];

    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const feed = await this.activityService.getFeed(ids, parsedPage, parsedLimit);
    return { success: true, data: feed };
  }

  /** 특정 트레이더의 공개 활동을 조회합니다
   * Get public activities for a specific trader */
  @Get('activities/:userId')
  async getUserActivities(
    @Param('userId') targetUserId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!targetUserId) {
      throw new BadRequestException('userId parameter is required');
    }

    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    const activities = await this.activityService.getUserActivities(
      targetUserId,
      parsedPage,
      parsedLimit,
    );
    return { success: true, data: activities };
  }

  /** 트레이더 활동의 공개 여부를 변경합니다
   * Toggle activity visibility for the trader */
  @Put('activities/visibility')
  async setVisibility(
    @Headers('x-user-id') userId: string,
    @Body() body: { isPublic: boolean },
  ) {
    this.validateUserId(userId);

    if (typeof body.isPublic !== 'boolean') {
      throw new BadRequestException('isPublic must be a boolean');
    }

    const result = await this.activityService.setVisibility(userId, body.isPublic);
    return { success: true, data: result };
  }

  private validateUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }
  }
}
