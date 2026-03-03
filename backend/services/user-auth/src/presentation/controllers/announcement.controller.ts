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

  @Get(':id/adjacent')
  @Public()
  async getAdjacent(@Param('id') id: string) {
    const result = await this.announcementService.getAdjacent(id);
    return { success: true, data: result };
  }

  @Get(':id')
  @OptionalAuth()
  async detail(@Param('id') id: string, @CurrentUser() user?: UserDto) {
    const result = await this.announcementService.detail(id, user?.id);
    return { success: true, data: result };
  }

  @Post()
  async create(
    @CurrentUser() user: UserDto,
    @Body() body: { title: string; content: string; isPinned?: boolean },
  ) {
    const result = await this.announcementService.create(user, body.title, body.content, body.isPinned);
    return { success: true, data: result };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body() body: { title: string; content: string; isPinned?: boolean },
  ) {
    const result = await this.announcementService.update(user, id, body.title, body.content, body.isPinned);
    return { success: true, data: result };
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    await this.announcementService.delete(user, id);
    return { success: true, message: 'Announcement deleted' };
  }

  // Pin toggle
  @Post(':id/pin')
  async togglePin(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    const result = await this.announcementService.togglePin(user, id);
    return { success: true, data: result };
  }

  // Like
  @Post(':id/like')
  async toggleAnnouncementLike(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    const result = await this.announcementService.toggleAnnouncementLike(user.id, id);
    return { success: true, data: result };
  }

  // View count
  @Post(':id/view')
  @Public()
  async incrementViewCount(@Param('id') id: string) {
    await this.announcementService.incrementViewCount(id);
    return { success: true };
  }

  // Comment like
  @Post('comments/:commentId/like')
  async toggleCommentLike(
    @CurrentUser() user: UserDto,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.announcementService.toggleCommentLike(user.id, commentId);
    return { success: true, data: result };
  }

  // Attachments
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

  @Delete('attachments/:attachmentId')
  async deleteAttachment(
    @CurrentUser() user: UserDto,
    @Param('attachmentId') attachmentId: string,
  ) {
    await this.announcementService.deleteAttachment(user, attachmentId);
    return { success: true, message: 'Attachment deleted' };
  }

  // Comments
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

  @Delete('comments/:commentId')
  async deleteComment(
    @CurrentUser() user: UserDto,
    @Param('commentId') commentId: string,
  ) {
    await this.announcementService.deleteComment(user, commentId);
    return { success: true, message: 'Comment deleted' };
  }
}
