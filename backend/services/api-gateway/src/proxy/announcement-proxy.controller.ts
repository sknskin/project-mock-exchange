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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard, Public, OptionalAuth } from '../auth/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('api/announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /** 공지사항 목록 조회를 user-auth로 프록시
   * Proxy announcement list to user-auth */
  @Get()
  @ApiOperation({ summary: '공지사항 목록 조회', description: '공지사항 목록을 페이징, 검색, 카테고리 필터링 조건과 함께 조회합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiQuery({ name: 'search', required: false, description: '검색어' })
  @ApiQuery({ name: 'category', required: false, description: '카테고리 필터' })
  @ApiResponse({ status: 200, description: '공지사항 목록 반환 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async list(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/announcements',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 공지사항 첨부파일 조회를 user-auth로 프록시
   * Proxy announcement file serving to user-auth */
  @Get('uploads/:fileName')
  @Public()
  @ApiOperation({ summary: '업로드 파일 조회', description: '공지사항에 첨부된 업로드 파일을 제공합니다. 인증 불필요' })
  @ApiParam({ name: 'fileName', description: '파일명' })
  @ApiResponse({ status: 200, description: '파일 반환 성공' })
  @ApiResponse({ status: 404, description: '파일을 찾을 수 없음' })
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

  /** 이전/다음 공지사항 조회를 user-auth로 프록시
   * Proxy adjacent announcement lookup to user-auth */
  @Get(':id/adjacent')
  @Public()
  @ApiOperation({ summary: '인접 공지사항 조회', description: '특정 공지사항의 이전/다음 공지사항 정보를 조회합니다. 인증 불필요' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '인접 공지사항 반환 성공' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
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

  /** 공지사항 상세 조회를 user-auth로 프록시
   * Proxy announcement detail to user-auth */
  @Get(':id')
  @OptionalAuth()
  @ApiOperation({ summary: '공지사항 상세 조회', description: '특정 공지사항의 상세 내용을 조회합니다. 인증 시 좋아요 여부 등 추가 정보가 포함됩니다' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '공지사항 상세 반환 성공' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async detail(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/announcements/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 공지사항 생성을 user-auth로 프록시하고 WebSocket 알림 전송
   * Proxy announcement creation to user-auth and broadcast via WebSocket */
  @Post()
  @ApiOperation({ summary: '공지사항 생성', description: '새 공지사항을 생성합니다. 관리자 권한이 필요합니다' })
  @ApiResponse({ status: 201, description: '공지사항 생성 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  async create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; username?: string } | undefined;
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/announcements',
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    if (result.status < 400 && result.data) {
      const data = result.data as { id?: string; title?: string };
      this.chatGateway.server.emit('notification:announcement-new', {
        type: 'announcement-new',
        title: (body as { title?: string })?.title || data.title || '',
        announcementId: data.id,
        authorId: user?.id,
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(result.status).json(result.data);
  }

  /** 공지사항 수정을 user-auth로 프록시하고 WebSocket 알림 전송
   * Proxy announcement update to user-auth and broadcast via WebSocket */
  @Put(':id')
  @ApiOperation({ summary: '공지사항 수정', description: '기존 공지사항을 수정합니다. 관리자 권한이 필요합니다' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '공지사항 수정 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string; username?: string } | undefined;
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: `/announcements/${id}`,
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    if (result.status < 400) {
      this.chatGateway.server.emit('notification:announcement-updated', {
        type: 'announcement-updated',
        title: (body as { title?: string })?.title || '',
        announcementId: id,
        authorId: user?.id,
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(result.status).json(result.data);
  }

  /** 공지사항 삭제를 user-auth로 프록시
   * Proxy announcement deletion to user-auth */
  @Delete(':id')
  @ApiOperation({ summary: '공지사항 삭제', description: '공지사항을 삭제합니다. 관리자 권한이 필요합니다' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '공지사항 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async delete(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/announcements/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 공지사항 상단 고정 토글을 user-auth로 프록시
   * Proxy announcement pin toggle to user-auth */
  // 고정 토글 (Pin toggle)
  @Post(':id/pin')
  @ApiOperation({ summary: '공지사항 고정 토글', description: '공지사항의 상단 고정 여부를 토글합니다. 관리자 권한이 필요합니다' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '고정 상태 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
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

  /** 공지사항 좋아요 토글을 user-auth로 프록시
   * Proxy announcement like toggle to user-auth */
  // 좋아요 (Like)
  @Post(':id/like')
  @ApiOperation({ summary: '공지사항 좋아요 토글', description: '공지사항에 대한 좋아요를 추가하거나 취소합니다' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '좋아요 상태 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
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

  /** 공지사항 조회수 증가를 user-auth로 프록시
   * Proxy announcement view count increment to user-auth */
  // 조회수 (View count)
  @Post(':id/view')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @ApiOperation({ summary: '조회수 증가', description: '공지사항의 조회수를 1 증가시킵니다. 인증 불필요' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '조회수 증가 성공' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
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

  /** 댓글 좋아요 토글을 user-auth로 프록시
   * Proxy comment like toggle to user-auth */
  // 댓글 좋아요 (Comment like)
  @Post('comments/:commentId/like')
  @ApiOperation({ summary: '댓글 좋아요 토글', description: '공지사항 댓글에 대한 좋아요를 추가하거나 취소합니다' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '좋아요 상태 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
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

  /** 첨부파일 업로드를 user-auth로 프록시
   * Proxy attachment upload to user-auth */
  // 첨부파일 (base64 JSON 본문) (Attachments (base64 JSON body))
  @Post(':id/attachments')
  @ApiOperation({ summary: '첨부파일 업로드', description: '공지사항에 첨부파일을 업로드합니다. base64 인코딩된 JSON 본문으로 전송합니다' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 201, description: '첨부파일 업로드 성공' })
  @ApiResponse({ status: 400, description: '잘못된 파일 형식' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
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

  /** 첨부파일 삭제를 user-auth로 프록시
   * Proxy attachment deletion to user-auth */
  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: '첨부파일 삭제', description: '공지사항의 특정 첨부파일을 삭제합니다' })
  @ApiParam({ name: 'attachmentId', description: '첨부파일 ID' })
  @ApiResponse({ status: 200, description: '첨부파일 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '첨부파일을 찾을 수 없음' })
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

  /** 댓글 작성을 user-auth로 프록시
   * Proxy comment creation to user-auth */
  @Post(':id/comments')
  @ApiOperation({ summary: '댓글 작성', description: '공지사항에 새 댓글을 작성합니다' })
  @ApiParam({ name: 'id', description: '공지사항 ID' })
  @ApiResponse({ status: 201, description: '댓글 작성 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
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

  /** 댓글 삭제를 user-auth로 프록시
   * Proxy comment deletion to user-auth */
  @Delete('comments/:commentId')
  @ApiOperation({ summary: '댓글 삭제', description: '공지사항의 특정 댓글을 삭제합니다. 본인 댓글 또는 관리자만 가능합니다' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '댓글 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족 (본인 댓글이 아님)' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
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
