/**
 * @file 팔로우 컨트롤러
 * @description 트레이더 팔로우/언팔로우, 팔로우 목록, 알림 모드 변경 API
 *
 * @file Follow Controller
 * @description Trader follow/unfollow, follow lists, and notification mode API
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import { FollowService } from '../../application/services/follow.service';
import { UpdateNotifyModeDto } from '../dto/follow.dto';

// InternalAuthGuard로 API Gateway에서만 접근 가능 / Only accessible from API Gateway via InternalAuthGuard
@Controller('follow')
@UseGuards(InternalAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  /**
   * 트레이더 팔로우
   * Follow a trader
   */
  @Post(':userId')
  async follow(
    @Param('userId') followeeId: string,
    @Headers('x-user-id') followerId: string,
  ) {
    if (!followerId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const data = await this.followService.follow(followerId, followeeId);
    return { success: true, data };
  }

  /**
   * 트레이더 언팔로우
   * Unfollow a trader
   */
  @Delete(':userId')
  async unfollow(
    @Param('userId') followeeId: string,
    @Headers('x-user-id') followerId: string,
  ) {
    if (!followerId) {
      throw new BadRequestException('x-user-id header is required');
    }

    await this.followService.unfollow(followerId, followeeId);
    return { success: true, message: 'Unfollowed successfully' };
  }

  /**
   * 내가 팔로우하는 사용자 목록
   * List users I'm following
   */
  @Get('following')
  async getFollowing(
    @Headers('x-user-id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const data = await this.followService.getFollowing(userId, page, limit);
    return { success: true, data };
  }

  /**
   * 특정 사용자의 팔로워 목록
   * List followers of a user
   */
  @Get('followers/:userId')
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const data = await this.followService.getFollowers(userId, page, limit);
    return { success: true, data };
  }

  /**
   * 팔로잉/팔로워 수 조회
   * Get follow counts
   */
  @Get('counts/:userId')
  async getFollowCounts(@Param('userId') userId: string) {
    const data = await this.followService.getFollowCounts(userId);
    return { success: true, data };
  }

  /**
   * 팔로우 여부 확인
   * Check if I'm following a user
   */
  @Get('status/:userId')
  async isFollowing(
    @Param('userId') followeeId: string,
    @Headers('x-user-id') followerId: string,
  ) {
    if (!followerId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const isFollowing = await this.followService.isFollowing(followerId, followeeId);
    return { success: true, data: { isFollowing } };
  }

  /**
   * 팔로워 ID 목록 조회 (알림 팬아웃용 내부 엔드포인트)
   * Get follower IDs (internal endpoint for notification fan-out)
   */
  @Get('follower-ids/:userId')
  async getFollowerIds(@Param('userId') userId: string) {
    const data = await this.followService.getFollowerIds(userId);
    return { success: true, data };
  }

  /**
   * 알림 모드 변경
   * Update notification mode
   */
  @Put(':userId/notify-mode')
  async updateNotifyMode(
    @Param('userId') followeeId: string,
    @Body() dto: UpdateNotifyModeDto,
    @Headers('x-user-id') followerId: string,
  ) {
    if (!followerId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const data = await this.followService.updateNotifyMode(followerId, followeeId, dto.notifyMode);
    return { success: true, data };
  }
}
