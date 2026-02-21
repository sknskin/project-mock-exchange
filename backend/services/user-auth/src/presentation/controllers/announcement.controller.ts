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
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { AnnouncementService } from '../../application/services/announcement.service';
import { UserDto } from '@mock-exchange/common';

@Controller('announcements')
@UseGuards(JwtAuthGuard)
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
    const result = await this.announcementService.list({ page, limit, search });
    return { success: true, data: result };
  }

  @Get('uploads/:fileName')
  @UseGuards() // Override class-level guard - no auth needed
  async serveFile(@Param('fileName') fileName: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    return res.sendFile(filePath);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
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
  @UseGuards() // Override class-level guard - no auth needed
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
    const ext = path.extname(body.originalName);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, fileName), Buffer.from(body.data, 'base64'));

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
