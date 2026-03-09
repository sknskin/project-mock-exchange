/**
 * @file 공지사항 컨트롤러
 * @description 공지사항 CRUD + 댓글/답글 API
 *
 * @file Announcement Controller
 * @description Announcement CRUD + Comments/Replies API
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
  Res,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard, Public, OptionalAuth } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { AnnouncementService } from '../../application/services/announcement.service';
import { UserDto } from '@virtuex/common';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@Controller('announcements')
@UseGuards(InternalAuthGuard, JwtAuthGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  /** 공지사항 목록 조회 (페이지네이션, 검색)
   * List announcements with pagination and search */
  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    // 페이지네이션 최대값 제한 — 메모리 소진 방지 / Cap pagination limit to prevent memory exhaustion
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeSearch = search ? search.slice(0, 100) : undefined;
    const result = await this.announcementService.list({ page: safePage, limit: safeLimit, search: safeSearch });
    return { success: true, data: result };
  }

  /** 첨부파일 다운로드 (공개)
   * Serve attachment file (public) */
  @Get('uploads/:fileName')
  @Public()
  async serveFile(@Param('fileName') fileName: string, @Res() res: Response) {
    // Path traversal 방지: basename으로 경로 요소 제거 (Prevent path traversal: strip directory components)
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

  /** 이전/다음 공지사항 조회
   * Get previous/next announcements */
  @Get(':id/adjacent')
  @Public()
  async getAdjacent(@Param('id') id: string) {
    const result = await this.announcementService.getAdjacent(id);
    return { success: true, data: result };
  }

  /** 공지사항 상세 조회 (댓글 포함)
   * Get announcement detail with comments */
  @Get(':id')
  @OptionalAuth()
  async detail(@Param('id') id: string, @CurrentUser() user?: UserDto) {
    const result = await this.announcementService.detail(id, user?.id);
    return { success: true, data: result };
  }

  /** 공지사항 작성 (관리자 전용)
   * Create announcement (admin only) */
  @Post()
  async create(
    @CurrentUser() user: UserDto,
    @Body() body: { title: string; content: string; isPinned?: boolean },
  ) {
    const result = await this.announcementService.create(user, body.title, body.content, body.isPinned);
    return { success: true, data: result };
  }

  /** 공지사항 수정
   * Update announcement */
  @Put(':id')
  async update(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body() body: { title: string; content: string; isPinned?: boolean },
  ) {
    const result = await this.announcementService.update(user, id, body.title, body.content, body.isPinned);
    return { success: true, data: result };
  }

  /** 공지사항 삭제
   * Delete announcement */
  @Delete(':id')
  async delete(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    await this.announcementService.delete(user, id);
    return { success: true, message: 'Announcement deleted' };
  }

  /** 공지사항 고정/고정 해제 토글
   * Toggle announcement pin status */
  @Post(':id/pin')
  async togglePin(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    const result = await this.announcementService.togglePin(user, id);
    return { success: true, data: result };
  }

  /** 공지사항 좋아요 토글
   * Toggle announcement like */
  @Post(':id/like')
  async toggleAnnouncementLike(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    const result = await this.announcementService.toggleAnnouncementLike(user.id, id);
    return { success: true, data: result };
  }

  /** 조회수 증가
   * Increment view count */
  @Post(':id/view')
  @Public()
  async incrementViewCount(@Param('id') id: string) {
    await this.announcementService.incrementViewCount(id);
    return { success: true };
  }

  /** 댓글 좋아요 토글
   * Toggle comment like */
  @Post('comments/:commentId/like')
  async toggleCommentLike(
    @CurrentUser() user: UserDto,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.announcementService.toggleCommentLike(user.id, commentId);
    return { success: true, data: result };
  }

  /** 첨부파일 업로드 (base64 JSON, 10MB 제한)
   * Upload attachment (base64 JSON, 10MB limit) */
  @Post(':id/attachments')
  async addAttachment(
    @CurrentUser() _user: UserDto,
    @Param('id') id: string,
    @Body() body: { originalName: string; mimeType: string; size: number; data: string },
  ) {
    // 파일 사이즈 검증 (10MB 제한) / Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const bufferData = Buffer.from(body.data, 'base64');
    if (bufferData.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
    // 파일명에서 안전한 확장자만 추출 (Extract safe extension from filename)
    const safeName = path.basename(body.originalName);
    const ext = path.extname(safeName);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, fileName), bufferData);

    const result = await this.announcementService.addAttachment(id, {
      fileName,
      originalName: body.originalName,
      mimeType: body.mimeType,
      size: body.size,
    });
    return { success: true, data: result };
  }

  /** 첨부파일 삭제
   * Delete attachment */
  @Delete('attachments/:attachmentId')
  async deleteAttachment(
    @CurrentUser() user: UserDto,
    @Param('attachmentId') attachmentId: string,
  ) {
    await this.announcementService.deleteAttachment(user, attachmentId);
    return { success: true, message: 'Attachment deleted' };
  }

  /** 댓글/답글 작성
   * Add comment or reply */
  @Post(':id/comments')
  async addComment(
    @CurrentUser() user: UserDto,
    @Param('id') announcementId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    const result = await this.announcementService.addComment(
      user,
      announcementId,
      body.content,
      body.parentId,
    );
    return { success: true, data: result };
  }

  /** 댓글 삭제
   * Delete comment */
  @Delete('comments/:commentId')
  async deleteComment(
    @CurrentUser() user: UserDto,
    @Param('commentId') commentId: string,
  ) {
    await this.announcementService.deleteComment(user, commentId);
    return { success: true, message: 'Comment deleted' };
  }
}
