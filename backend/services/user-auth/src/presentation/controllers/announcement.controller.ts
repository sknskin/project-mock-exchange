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
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { AnnouncementService } from '../../application/services/announcement.service';
import { UserDto } from '@mock-exchange/common';

@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    const result = await this.announcementService.list({ page, limit, search });
    return { success: true, data: result };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const result = await this.announcementService.detail(id);
    return { success: true, data: result };
  }

  @Post()
  async create(
    @CurrentUser() user: UserDto,
    @Body() body: { title: string; content: string },
  ) {
    const result = await this.announcementService.create(user, body.title, body.content);
    return { success: true, data: result };
  }

  @Put(':id')
  async update(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body() body: { title: string; content: string },
  ) {
    const result = await this.announcementService.update(user, id, body.title, body.content);
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
