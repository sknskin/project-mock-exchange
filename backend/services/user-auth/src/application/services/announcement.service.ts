/**
 * @file 공지사항 서비스
 * @description 공지사항 CRUD + 댓글 비즈니스 로직
 *
 * @file Announcement Service
 * @description Announcement CRUD + Comment business logic
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserDto, USER_ROLE } from '@virtuex/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 공지사항 목록 조회 (고정글 우선, 페이지네이션)
   * List announcements (pinned first, with pagination) */
  async list(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where: where as never,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: { select: { id: true, username: true, name: true, role: true } },
          attachments: true,
          _count: { select: { comments: true, attachments: true, likes: true } },
        },
      }),
      this.prisma.announcement.count({ where: where as never }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        title: a.title,
        author: a.author,
        isPinned: a.isPinned,
        viewCount: a.viewCount,
        likeCount: a._count.likes,
        commentCount: a._count.comments,
        attachmentCount: a._count.attachments,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** 이전/다음 공지사항 조회
   * Get previous and next announcements */
  async getAdjacent(id: string) {
    const current = await this.prisma.announcement.findUnique({
      where: { id },
      select: { createdAt: true },
    });
    if (!current) throw new NotFoundException('Announcement not found');

    const [prev, next] = await Promise.all([
      this.prisma.announcement.findFirst({
        where: {
          id: { not: id },
          OR: [
            { createdAt: { lt: current.createdAt } },
            { createdAt: current.createdAt, id: { lt: id } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, title: true },
      }),
      this.prisma.announcement.findFirst({
        where: {
          id: { not: id },
          OR: [
            { createdAt: { gt: current.createdAt } },
            { createdAt: current.createdAt, id: { gt: id } },
          ],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, title: true },
      }),
    ]);

    return { prev, next };
  }

  /** 공지사항 상세 조회 (댓글, 좋아요, 첨부파일 포함)
   * Get announcement detail with comments, likes, and attachments */
  async detail(id: string, userId?: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, name: true, role: true } },
        attachments: true,
        _count: { select: { likes: true } },
        likes: userId ? { where: { userId }, select: { id: true } } : false,
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, username: true, name: true, role: true } },
            _count: { select: { likes: true } },
            likes: userId ? { where: { userId }, select: { id: true } } : false,
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: { id: true, username: true, name: true, role: true } },
                _count: { select: { likes: true } },
                likes: userId ? { where: { userId }, select: { id: true } } : false,
              },
            },
          },
        },
      },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');

    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      author: announcement.author,
      isPinned: announcement.isPinned,
      viewCount: announcement.viewCount,
      likeCount: announcement._count.likes,
      isLiked: announcement.likes ? announcement.likes.length > 0 : false,
      attachments: announcement.attachments,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      editedAt: announcement.editedAt,
      comments: announcement.comments.map((c: { id: string; content: string; author: { id: string; username: string; name: string | null }; _count: { likes: number }; likes?: { id: string }[]; createdAt: Date; updatedAt: Date; replies: { id: string; content: string; author: { id: string; username: string; name: string | null }; _count: { likes: number }; likes?: { id: string }[]; createdAt: Date; updatedAt: Date }[] }) => ({
        id: c.id,
        content: c.content,
        author: c.author,
        likeCount: c._count.likes,
        isLiked: c.likes ? c.likes.length > 0 : false,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        replies: c.replies.map((r) => ({
          id: r.id,
          content: r.content,
          author: r.author,
          likeCount: r._count.likes,
          isLiked: r.likes ? r.likes.length > 0 : false,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      })),
    };
  }

  /** 공지사항 좋아요 토글
   * Toggle announcement like */
  async toggleAnnouncementLike(userId: string, announcementId: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    const existing = await this.prisma.announcementLike.findUnique({
      where: { userId_announcementId: { userId, announcementId } },
    });

    if (existing) {
      await this.prisma.announcementLike.delete({ where: { id: existing.id } });
      return { liked: false };
    } else {
      await this.prisma.announcementLike.create({
        data: { userId, announcementId },
      });
      return { liked: true };
    }
  }

  /** 댓글 좋아요 토글
   * Toggle comment like */
  async toggleCommentLike(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await this.prisma.commentLike.delete({ where: { id: existing.id } });
      return { liked: false };
    } else {
      await this.prisma.commentLike.create({
        data: { userId, commentId },
      });
      return { liked: true };
    }
  }

  /** 조회수 1 증가
   * Increment view count by 1 */
  async incrementViewCount(announcementId: string) {
    await this.prisma.announcement.update({
      where: { id: announcementId },
      data: { viewCount: { increment: 1 } },
    });
  }

  /** 공지사항 작성 및 전체 사용자 알림 발송
   * Create announcement and notify all active users */
  async create(user: UserDto, title: string, content: string, isPinned?: boolean) {
    if (user.role !== USER_ROLE.SYSTEM && user.role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException('Only SYSTEM/ADMIN can create announcements');
    }

    const announcement = await this.prisma.announcement.create({
      data: { title, content, authorId: user.id, isPinned: isPinned ?? false },
      include: {
        author: { select: { id: true, username: true, name: true, role: true } },
        attachments: true,
      },
    });

    // 모든 활성 사용자에게 새 공지사항 알림 (Notify all active users about new announcement)
    try {
      const users = await this.prisma.user.findMany({
        where: { isActive: true, id: { not: user.id } },
        select: { id: true },
      });
      if (users.length > 0) {
        await this.prisma.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            type: 'ANNOUNCEMENT_NEW' as const,
            title: '새 공지사항',
            message: title,
            link: `/announcements/${announcement.id}`,
          })),
        });
      }
    } catch (e) {
      this.logger.warn(`Notification creation failed: ${e instanceof Error ? e.message : e}`);
    }

    this.logger.log(`Announcement created: ${title} by ${user.username}`);
    return announcement;
  }

  /** 공지사항 수정 및 수정 알림 발송
   * Update announcement and send update notification */
  async update(user: UserDto, id: string, title: string, content: string, isPinned?: boolean) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    // SYSTEM 또는 원래 작성자(ADMIN인 경우)만 수정 가능 (Only SYSTEM or the original author (if ADMIN) can edit)
    if (user.role !== USER_ROLE.SYSTEM && announcement.authorId !== user.id) {
      throw new ForbiddenException('Only SYSTEM or the author can edit');
    }

    const updateData: Record<string, unknown> = { title, content, editedAt: new Date() };
    if (isPinned !== undefined) {
      updateData.isPinned = isPinned;
    }

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, username: true, name: true, role: true } },
        attachments: true,
      },
    });

    // 수정에 대해 알림 (Notify about update)
    const users = await this.prisma.user.findMany({
      where: { isActive: true, id: { not: user.id } },
      select: { id: true },
    });
    if (users.length > 0) {
      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: 'ANNOUNCEMENT_UPDATED' as const,
          title: '공지사항 수정',
          message: title,
          link: `/announcements/${id}`,
        })),
      });
    }

    return updated;
  }

  /** 공지사항 삭제 (SYSTEM 또는 작성자만)
   * Delete announcement (SYSTEM or author only) */
  async delete(user: UserDto, id: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    if (user.role !== USER_ROLE.SYSTEM && announcement.authorId !== user.id) {
      throw new ForbiddenException('Only SYSTEM or the author can delete');
    }

    await this.prisma.announcement.delete({ where: { id } });
    this.logger.log(`Announcement deleted: ${id} by ${user.username}`);
  }

  /** 공지사항 고정/해제 토글 (관리자 전용)
   * Toggle announcement pin (admin only) */
  async togglePin(user: UserDto, id: string) {
    if (user.role !== USER_ROLE.SYSTEM && user.role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException('Only SYSTEM/ADMIN can pin announcements');
    }

    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: { isPinned: !announcement.isPinned },
      include: {
        author: { select: { id: true, username: true, name: true, role: true } },
        attachments: true,
      },
    });

    this.logger.log(`Announcement ${id} pin toggled to ${updated.isPinned} by ${user.username}`);
    return updated;
  }

  /** 공지사항에 첨부파일 추가
   * Add attachment to announcement */
  async addAttachment(
    announcementId: string,
    file: { fileName: string; originalName: string; mimeType: string; size: number },
  ) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    return this.prisma.attachment.create({
      data: {
        announcementId,
        fileName: file.fileName,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      },
    });
  }

  /** 첨부파일 삭제 (SYSTEM 또는 작성자만)
   * Delete attachment (SYSTEM or author only) */
  async deleteAttachment(user: UserDto, attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { announcement: true },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    if (user.role !== USER_ROLE.SYSTEM && attachment.announcement.authorId !== user.id) {
      throw new ForbiddenException('Only SYSTEM or the author can delete attachments');
    }

    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    this.logger.log(`Attachment ${attachmentId} deleted by ${user.username}`);
  }

  /** 댓글/답글 작성
   * Add comment or reply */
  async addComment(user: UserDto, announcementId: string, content: string, parentId?: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    if (parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.announcementId !== announcementId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    return this.prisma.comment.create({
      data: {
        content,
        authorId: user.id,
        announcementId,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, username: true, name: true, role: true } },
      },
    });
  }

  /** 댓글 삭제 (SYSTEM 또는 작성자만)
   * Delete comment (SYSTEM or author only) */
  async deleteComment(user: UserDto, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (user.role !== USER_ROLE.SYSTEM && comment.authorId !== user.id) {
      throw new ForbiddenException('Only SYSTEM or the author can delete');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
