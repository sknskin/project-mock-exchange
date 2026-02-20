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
import { UserDto, USER_ROLE } from '@mock-exchange/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, name: true, role: true } },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.announcement.count({ where: where as never }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content.length > 200 ? a.content.slice(0, 200) + '...' : a.content,
        author: a.author,
        commentCount: a._count.comments,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async detail(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, name: true, role: true } },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, username: true, name: true, role: true } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: { id: true, username: true, name: true, role: true } },
              },
            },
          },
        },
      },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  async create(user: UserDto, title: string, content: string) {
    if (user.role !== USER_ROLE.SYSTEM && user.role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException('Only SYSTEM/ADMIN can create announcements');
    }

    const announcement = await this.prisma.announcement.create({
      data: { title, content, authorId: user.id },
      include: {
        author: { select: { id: true, username: true, name: true, role: true } },
      },
    });

    // Notify all active users about new announcement
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

    this.logger.log(`Announcement created: ${title} by ${user.username}`);
    return announcement;
  }

  async update(user: UserDto, id: string, title: string, content: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    // Only SYSTEM or the original author (if ADMIN) can edit
    if (user.role !== USER_ROLE.SYSTEM && announcement.authorId !== user.id) {
      throw new ForbiddenException('Only SYSTEM or the author can edit');
    }

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: { title, content },
      include: {
        author: { select: { id: true, username: true, name: true, role: true } },
      },
    });

    // Notify about update
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

  async delete(user: UserDto, id: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    if (user.role !== USER_ROLE.SYSTEM && announcement.authorId !== user.id) {
      throw new ForbiddenException('Only SYSTEM or the author can delete');
    }

    await this.prisma.announcement.delete({ where: { id } });
    this.logger.log(`Announcement deleted: ${id} by ${user.username}`);
  }

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

  async deleteComment(user: UserDto, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (user.role !== USER_ROLE.SYSTEM && comment.authorId !== user.id) {
      throw new ForbiddenException('Only SYSTEM or the author can delete');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
