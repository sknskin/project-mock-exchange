/**
 * @file 전략 공유 컨트롤러
 * @description 전략 공유 CRUD + 댓글/좋아요 API
 *
 * @file Strategy Sharing Controller
 * @description Strategy sharing CRUD + Comments/Likes API
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
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { CreateStrategyDto, UpdateStrategyDto, CreateStrategyCommentDto } from '../dto/strategy.dto';

// InternalAuthGuard로 API Gateway에서만 접근 가능 / Only accessible from API Gateway via InternalAuthGuard
@Controller('strategies')
@UseGuards(InternalAuthGuard)
export class StrategyController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 전략 목록 조회 (페이지네이션, 심볼 필터, 검색)
   * List strategies with pagination, symbol filter, and search
   */
  @Get()
  async listStrategies(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('symbol') symbol?: string,
    @Query('search') search?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    // 입력값 안전 범위 제한 — 메모리 소진 및 DoS 방지 / Sanitize input bounds — prevents memory exhaustion and DoS
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeSearch = search ? search.slice(0, 100) : undefined;
    const safeSymbol = symbol ? symbol.slice(0, 20) : undefined;

    const where: Record<string, unknown> = {};
    if (safeSymbol) {
      where.symbol = safeSymbol;
    }
    if (safeSearch) {
      where.OR = [
        { title: { contains: safeSearch, mode: 'insensitive' } },
        { description: { contains: safeSearch, mode: 'insensitive' } },
      ];
    }

    const [strategies, total] = await Promise.all([
      this.prisma.communityStrategy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
          likes: userId ? { where: { userId }, select: { id: true } } : false,
        },
      }),
      this.prisma.communityStrategy.count({ where }),
    ]);

    const data = strategies.map((strategy) => ({
      id: strategy.id,
      symbol: strategy.symbol,
      title: strategy.title,
      description: strategy.description,
      performance: strategy.performance ? Number(strategy.performance) : null,
      authorId: strategy.authorId,
      authorName: strategy.authorName,
      viewCount: strategy.viewCount,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
      likeCount: strategy._count.likes,
      commentCount: strategy._count.comments,
      liked: userId ? strategy.likes.length > 0 : false,
    }));

    return {
      success: true,
      data: {
        strategies: data,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * 전략 상세 조회 (댓글 포함, 조회수 증가)
   * Get strategy detail with comments, increment view count
   */
  @Get(':id')
  async getStrategy(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const strategy = await this.prisma.communityStrategy.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
        likes: userId ? { where: { userId }, select: { id: true } } : false,
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    // 조회수 증가 — 상세 페이지 진입 시 자동 증가
    // Increment view count — auto-increment on detail page entry
    await this.prisma.communityStrategy.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // 댓글을 트리 구조로 변환 — parentId 기반 중첩 응답
    // Transform comments to tree structure — nested response based on parentId
    const comments = strategy.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      authorId: comment.authorId,
      authorName: comment.authorName,
      strategyId: comment.strategyId,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
    }));

    return {
      success: true,
      data: {
        id: strategy.id,
        symbol: strategy.symbol,
        title: strategy.title,
        description: strategy.description,
        performance: strategy.performance ? Number(strategy.performance) : null,
        authorId: strategy.authorId,
        authorName: strategy.authorName,
        viewCount: strategy.viewCount + 1,
        createdAt: strategy.createdAt,
        updatedAt: strategy.updatedAt,
        likeCount: strategy._count.likes,
        liked: userId ? strategy.likes.length > 0 : false,
        comments,
      },
    };
  }

  /**
   * 전략 작성
   * Create a new strategy
   */
  @Post()
  async createStrategy(
    @Body() dto: CreateStrategyDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
    @Headers('x-user-role') userRole: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    // 시스템관리자/관리자는 모든 자격 제한 없이 전략 작성 가능
    // SYSTEM/ADMIN users can create strategies without any restrictions
    const isAdmin = userRole === 'SYSTEM' || userRole === 'ADMIN';

    if (!isAdmin) {
      // 서버측 전략 작성 자격 검증 (#15)
      // Server-side strategy write eligibility check (#15)
      // 전체 자격 기준 (수익률 >= 5% 또는 상위 20% 자산)은 클라이언트에서 리더보드 데이터를 통해 검증됩니다.
      // Full eligibility criteria (return rate >= 5% OR top 20% assets) is validated client-side via leaderboard data.
      // 서버측 기본 가드: 가입 후 최소 1일이 경과한 사용자만 전략 작성 가능
      // Server-side basic guard: only users who have been members for at least 1 day can create strategies
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const oneDayMs = 24 * 60 * 60 * 1000;
      const membershipDuration = Date.now() - user.createdAt.getTime();
      if (membershipDuration < oneDayMs) {
        throw new ForbiddenException(
          'You must be a member for at least 1 day before creating a strategy',
        );
      }
    }

    const decodedName = userName ? decodeURIComponent(userName) : 'Unknown';

    const strategy = await this.prisma.communityStrategy.create({
      data: {
        symbol: dto.symbol,
        title: dto.title,
        description: dto.description,
        performance: dto.performance ?? null,
        authorId: userId,
        authorName: decodedName,
      },
    });

    return { success: true, data: strategy };
  }

  /**
   * 전략 수정 (작성자만)
   * Update strategy (author only)
   */
  @Put(':id')
  async updateStrategy(
    @Param('id') id: string,
    @Body() dto: UpdateStrategyDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const strategy = await this.prisma.communityStrategy.findUnique({ where: { id } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }
    if (strategy.authorId !== userId) {
      throw new ForbiddenException('Only the author can update this strategy');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.symbol !== undefined) updateData.symbol = dto.symbol;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.performance !== undefined) updateData.performance = dto.performance;

    const updated = await this.prisma.communityStrategy.update({
      where: { id },
      data: updateData,
    });

    return { success: true, data: updated };
  }

  /**
   * 전략 삭제 (작성자 또는 관리자)
   * Delete strategy (author or ADMIN)
   */
  @Delete(':id')
  async deleteStrategy(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const strategy = await this.prisma.communityStrategy.findUnique({ where: { id } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }
    if (strategy.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the author or an admin can delete this strategy');
    }

    await this.prisma.communityStrategy.delete({ where: { id } });

    return { success: true, message: 'Strategy deleted' };
  }

  /**
   * 전략 좋아요 토글
   * Toggle strategy like
   */
  @Post(':id/like')
  async toggleStrategyLike(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const strategy = await this.prisma.communityStrategy.findUnique({ where: { id } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    const existing = await this.prisma.communityStrategyLike.findUnique({
      where: { userId_strategyId: { userId, strategyId: id } },
    });

    if (existing) {
      await this.prisma.communityStrategyLike.delete({ where: { id: existing.id } });
      const count = await this.prisma.communityStrategyLike.count({ where: { strategyId: id } });
      return { success: true, data: { liked: false, likeCount: count } };
    } else {
      await this.prisma.communityStrategyLike.create({
        data: { userId, strategyId: id },
      });
      const count = await this.prisma.communityStrategyLike.count({ where: { strategyId: id } });
      return { success: true, data: { liked: true, likeCount: count } };
    }
  }

  /**
   * 조회수 증가
   * Increment view count
   */
  @Post(':id/view')
  async incrementViewCount(@Param('id') id: string) {
    const strategy = await this.prisma.communityStrategy.findUnique({ where: { id } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    await this.prisma.communityStrategy.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return { success: true };
  }

  /**
   * 전략 댓글 작성 (대댓글 지원)
   * Create strategy comment (with optional parentId for replies)
   */
  @Post(':id/comments')
  async createComment(
    @Param('id') strategyId: string,
    @Body() dto: CreateStrategyCommentDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const strategy = await this.prisma.communityStrategy.findUnique({ where: { id: strategyId } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.communityStrategyComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.strategyId !== strategyId) {
        throw new BadRequestException('Invalid parent comment');
      }
    }

    const decodedName = userName ? decodeURIComponent(userName) : 'Unknown';

    const comment = await this.prisma.communityStrategyComment.create({
      data: {
        content: dto.content,
        authorId: userId,
        authorName: decodedName,
        strategyId,
        parentId: dto.parentId || null,
      },
    });

    return { success: true, data: comment };
  }

  /**
   * 전략 댓글 삭제 (작성자 또는 관리자)
   * Delete strategy comment (author or ADMIN)
   */
  @Delete('comments/:id')
  async deleteComment(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const comment = await this.prisma.communityStrategyComment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the author or an admin can delete this comment');
    }

    await this.prisma.communityStrategyComment.delete({ where: { id } });

    return { success: true, message: 'Comment deleted' };
  }
}
