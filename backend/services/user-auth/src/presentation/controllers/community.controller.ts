/**
 * @file 커뮤니티 게시판 컨트롤러
 * @description 커뮤니티 게시글 CRUD + 댓글/좋아요 API
 *
 * @file Community Board Controller
 * @description Community post CRUD + Comments/Likes API
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
  Res,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { CreatePostDto, UpdatePostDto, CreateCommentDto } from '../dto/community.dto';

// InternalAuthGuard로 API Gateway에서만 접근 가능 / Only accessible from API Gateway via InternalAuthGuard
@Controller('community')
@UseGuards(InternalAuthGuard)
export class CommunityController {
  constructor(private readonly prisma: PrismaService) {
    // 서비스 시작 시 업로드 디렉토리 생성 보장 / Ensure uploads directory exists on service startup
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  /**
   * 게시글 목록 조회 (페이지네이션, 카테고리 필터, 검색)
   * List posts with pagination, category filter, and search
   */
  @Get('posts')
  async listPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    // 입력값 안전 범위 제한 — 메모리 소진 및 DoS 방지 / Sanitize input bounds — prevents memory exhaustion and DoS
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeSearch = search ? search.slice(0, 100) : undefined;
    const safeCategory = category ? category.slice(0, 50) : undefined;

    const where: Record<string, unknown> = {};
    if (safeCategory) {
      where.category = safeCategory;
    }
    if (safeSearch) {
      where.OR = [
        { title: { contains: safeSearch, mode: 'insensitive' } },
        { content: { contains: safeSearch, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          _count: {
            select: {
              comments: true,
              likes: true,
              attachments: true,
            },
          },
          likes: userId ? { where: { userId }, select: { id: true } } : false,
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    const data = posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      visibility: post.visibility,
      authorId: post.authorId,
      authorName: post.authorName,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      commentCount: post._count.comments,
      likeCount: post._count.likes,
      attachmentCount: post._count.attachments,
      liked: userId ? post.likes.length > 0 : false,
    }));

    return {
      success: true,
      data: {
        posts: data,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * 게시글 상세 조회 (댓글 포함, 조회수 증가)
   * Get post detail with comments, increment view count
   */
  @Get('posts/:id')
  async getPost(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
        likes: userId ? { where: { userId }, select: { id: true } } : false,
        attachments: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, fileName: true, originalName: true, mimeType: true, size: true, createdAt: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            _count: {
              select: { likes: true },
            },
            likes: userId ? { where: { userId }, select: { id: true } } : false,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // MEMBERS_ONLY 게시글: 인증되지 않은 사용자에게는 댓글 비공개 처리
    // MEMBERS_ONLY posts: hide comments from unauthenticated users
    if (post.visibility === 'MEMBERS_ONLY' && !userId) {
      return {
        success: true,
        data: {
          id: post.id,
          title: post.title,
          content: post.content,
          category: post.category,
          visibility: post.visibility,
          authorId: post.authorId,
          authorName: post.authorName,
          viewCount: post.viewCount,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likeCount: post._count.likes,
          liked: false,
          attachments: post.attachments,
          comments: [],
          membersOnly: true,
        },
      };
    }

    const comments = post.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      authorId: comment.authorId,
      authorName: comment.authorName,
      postId: comment.postId,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      likeCount: comment._count.likes,
      liked: userId ? comment.likes.length > 0 : false,
    }));

    return {
      success: true,
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        category: post.category,
        visibility: post.visibility,
        authorId: post.authorId,
        authorName: post.authorName,
        viewCount: post.viewCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likeCount: post._count.likes,
        liked: userId ? post.likes.length > 0 : false,
        attachments: post.attachments,
        comments,
      },
    };
  }

  /**
   * 게시글 작성
   * Create a new post
   */
  @Post('posts')
  async createPost(
    @Body() dto: CreatePostDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const decodedName = userName ? decodeURIComponent(userName) : 'Unknown';

    const post = await this.prisma.communityPost.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category || 'FREE',
        visibility: dto.visibility || 'PUBLIC',
        authorId: userId,
        authorName: decodedName,
      },
    });

    return { success: true, data: post };
  }

  /**
   * 게시글 수정 (작성자만)
   * Update post (author only)
   */
  @Put('posts/:id')
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('Only the author can update this post');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility;

    const updated = await this.prisma.communityPost.update({
      where: { id },
      data: updateData,
    });

    return { success: true, data: updated };
  }

  /**
   * 게시글 삭제 (작성자 또는 관리자)
   * Delete post (author or ADMIN)
   */
  @Delete('posts/:id')
  async deletePost(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the author or an admin can delete this post');
    }

    await this.prisma.communityPost.delete({ where: { id } });

    return { success: true, message: 'Post deleted' };
  }

  /**
   * 게시글 좋아요 토글
   * Toggle post like
   */
  @Post('posts/:id/like')
  async togglePostLike(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.communityPostLike.findUnique({
      where: { userId_postId: { userId, postId: id } },
    });

    if (existing) {
      await this.prisma.communityPostLike.delete({ where: { id: existing.id } });
      const count = await this.prisma.communityPostLike.count({ where: { postId: id } });
      return { success: true, data: { liked: false, likeCount: count } };
    } else {
      await this.prisma.communityPostLike.create({
        data: { userId, postId: id },
      });
      const count = await this.prisma.communityPostLike.count({ where: { postId: id } });
      return { success: true, data: { liked: true, likeCount: count } };
    }
  }

  /**
   * 조회수 증가
   * Increment view count
   */
  @Post('posts/:id/view')
  async incrementViewCount(@Param('id') id: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.communityPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return { success: true };
  }

  /**
   * 댓글 작성 (대댓글 지원)
   * Create comment (with optional parentId for replies)
   */
  @Post('posts/:id/comments')
  async createComment(
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-name') userName: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.communityComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Invalid parent comment');
      }
    }

    const decodedName = userName ? decodeURIComponent(userName) : 'Unknown';

    const comment = await this.prisma.communityComment.create({
      data: {
        content: dto.content,
        authorId: userId,
        authorName: decodedName,
        postId,
        parentId: dto.parentId || null,
      },
    });

    return { success: true, data: comment };
  }

  /**
   * 댓글 삭제 (작성자 또는 관리자)
   * Delete comment (author or ADMIN)
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

    const comment = await this.prisma.communityComment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the author or an admin can delete this comment');
    }

    await this.prisma.communityComment.delete({ where: { id } });

    return { success: true, message: 'Comment deleted' };
  }

  /**
   * 댓글 좋아요 토글
   * Toggle comment like
   */
  @Post('comments/:id/like')
  async toggleCommentLike(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const comment = await this.prisma.communityComment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await this.prisma.communityCommentLike.findUnique({
      where: { userId_commentId: { userId, commentId: id } },
    });

    if (existing) {
      await this.prisma.communityCommentLike.delete({ where: { id: existing.id } });
      const count = await this.prisma.communityCommentLike.count({ where: { commentId: id } });
      return { success: true, data: { liked: false, likeCount: count } };
    } else {
      await this.prisma.communityCommentLike.create({
        data: { userId, commentId: id },
      });
      const count = await this.prisma.communityCommentLike.count({ where: { commentId: id } });
      return { success: true, data: { liked: true, likeCount: count } };
    }
  }

  /**
   * 첨부파일 업로드 (base64 JSON, 작성자만)
   * Upload attachment (base64 JSON, author only)
   */
  @Post('posts/:id/attachments')
  async addAttachment(
    @Param('id') id: string,
    @Body() body: { originalName: string; mimeType: string; size: number; data: string },
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Only the author can add attachments');

    // MIME 화이트리스트 검증 / MIME type whitelist validation
    const ALLOWED_MIME_TYPES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!ALLOWED_MIME_TYPES.includes(body.mimeType)) {
      throw new BadRequestException(`File type not allowed: ${body.mimeType}`);
    }

    // 파일 크기 검증 — 서버 메모리 보호를 위해 10MB 제한 / File size validation — 10MB limit to protect server memory
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const bufferData = Buffer.from(body.data, 'base64');
    if (bufferData.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // 타임스탬프 + 랜덤 문자열로 고유 파일명 생성 — 충돌 방지 / Generate unique filename with timestamp + random string to prevent collisions
    const safeName = path.basename(body.originalName);
    const ext = path.extname(safeName);
    const fileName = `community-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, fileName), bufferData);

    const attachment = await this.prisma.communityAttachment.create({
      data: {
        postId: id,
        fileName,
        originalName: body.originalName,
        mimeType: body.mimeType,
        // 실제 디코딩된 파일 크기 사용 — body.size는 클라이언트 제공값이므로 신뢰 불가
        // Use actual decoded buffer size — body.size is client-supplied and cannot be trusted
        size: bufferData.length,
      },
    });

    return { success: true, data: attachment };
  }

  /**
   * 첨부파일 삭제 (작성자 또는 관리자)
   * Delete attachment (author or ADMIN)
   */
  @Delete('attachments/:attachmentId')
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }

    const attachment = await this.prisma.communityAttachment.findUnique({
      where: { id: attachmentId },
      include: { post: { select: { authorId: true } } },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.post.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the author or an admin can delete this attachment');
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', attachment.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await this.prisma.communityAttachment.delete({ where: { id: attachmentId } });

    return { success: true, message: 'Attachment deleted' };
  }

  /**
   * 첨부파일 다운로드 (공개)
   * Download attachment file (public)
   */
  @Get('uploads/:fileName')
  async serveFile(@Param('fileName') fileName: string, @Res() res: Response) {
    // Path Traversal 방지: basename으로 디렉토리 이동 제거, null 바이트 차단
    // Prevent Path Traversal: strip directory components with basename, block null bytes
    const safeName = path.basename(fileName);
    if (safeName !== fileName || fileName.includes('\0')) {
      return res.status(400).json({ success: false, message: 'Invalid file name' });
    }
    const filePath = path.join(process.cwd(), 'uploads', safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    return res.sendFile(filePath);
  }
}
