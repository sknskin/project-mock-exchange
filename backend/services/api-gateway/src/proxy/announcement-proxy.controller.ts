/**
 * @file 공지사항 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 공지사항 API로 프록시
 *
 * @file Announcement Proxy Controller
 * @description Proxies announcement API requests to User Auth service
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard, Public, OptionalAuth } from '../auth/jwt-auth.guard';

@Controller('api/announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  async list(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/announcements',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Get('uploads/:fileName')
  @Public()
  async serveFile(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/announcements/uploads/${fileName}`,
      responseType: 'arraybuffer',
    });
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }
    const contentType = result.headers?.['content-type'] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    return res.send(Buffer.from(result.data as ArrayBuffer));
  }

  @Get(':id/adjacent')
  @Public()
  async getAdjacent(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/announcements/${id}/adjacent`,
    });
    return res.status(result.status).json(result.data);
  }

  @Get(':id')
  @OptionalAuth()
  async detail(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/announcements/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/announcements',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: `/announcements/${id}`,
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/announcements/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  // 고정 토글 (Pin toggle)
  @Post(':id/pin')
  async togglePin(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/announcements/${id}/pin`,
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  // 좋아요 (Like)
  @Post(':id/like')
  async toggleAnnouncementLike(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/announcements/${id}/like`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  // 조회수 (View count)
  @Post(':id/view')
  @Public()
  async incrementViewCount(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/announcements/${id}/view`,
    });
    return res.status(result.status).json(result.data);
  }

  // 댓글 좋아요 (Comment like)
  @Post('comments/:commentId/like')
  async toggleCommentLike(
    @Param('commentId') commentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/announcements/comments/${commentId}/like`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  // 첨부파일 (base64 JSON 본문) (Attachments (base64 JSON body))
  @Post(':id/attachments')
  async uploadAttachment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/announcements/${id}/attachments`,
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Delete('attachments/:attachmentId')
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/announcements/attachments/${attachmentId}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/announcements/${id}/comments`,
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/announcements/comments/${commentId}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }
}
