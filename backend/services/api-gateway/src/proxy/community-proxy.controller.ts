/**
 * @file 커뮤니티 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 커뮤니티 API로 프록시
 *
 * @file Community Proxy Controller
 * @description Proxies community API requests to User Auth service
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
import * as path from 'path';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard, OptionalAuth } from '../auth/jwt-auth.guard';

// 컨트롤러 레벨에서 JwtAuthGuard 적용 — @OptionalAuth()로 개별 엔드포인트에서 인증 선택적 해제
// JwtAuthGuard applied at controller level — @OptionalAuth() makes auth optional per endpoint
@ApiTags('Community')
@ApiBearerAuth()
@Controller('api/community')
@UseGuards(JwtAuthGuard)
export class CommunityProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * 게시글 목록 조회 (인증 선택)
   * List posts (optional auth — if logged in, pass x-user-id for like status)
   */
  @Get('posts')
  @OptionalAuth()
  @ApiOperation({ summary: '커뮤니티 게시글 목록', description: '커뮤니티 게시글 목록을 페이징, 검색, 카테고리 필터링 조건과 함께 조회합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiQuery({ name: 'category', required: false, description: '카테고리 필터' })
  @ApiQuery({ name: 'search', required: false, description: '검색어' })
  @ApiResponse({ status: 200, description: '게시글 목록 반환 성공' })
  async listPosts(@Req() req: Request, @Res() res: Response) {
    // 인증된 사용자 정보가 있으면 헤더로 전달 — 좋아요 여부 확인에 사용
    // Pass authenticated user info via headers if available — used for like status
    const user = req.user as { id: string; role?: string; name?: string } | undefined;
    const headers: Record<string, string> = {};
    if (user?.id) {
      headers['x-user-id'] = user.id;
      headers['x-user-role'] = user.role || '';
      // 한글 이름은 HTTP 헤더에서 안전하게 전송하기 위해 encodeURIComponent 사용
      // encodeURIComponent for Korean names to safely transmit in HTTP headers
      headers['x-user-name'] = encodeURIComponent(user.name || '');
    }

    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/community/posts',
      params: req.query,
      headers,
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 게시글 상세 조회 (인증 선택)
   * Get post detail (optional auth)
   */
  @Get('posts/:id')
  @OptionalAuth()
  @ApiOperation({ summary: '커뮤니티 게시글 상세', description: '특정 게시글의 상세 내용을 조회합니다. 인증 시 좋아요 여부 등 추가 정보가 포함됩니다' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiResponse({ status: 200, description: '게시글 상세 반환 성공' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  async getPost(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string } | undefined;
    const headers: Record<string, string> = {};
    if (user?.id) {
      headers['x-user-id'] = user.id;
      headers['x-user-role'] = user.role || '';
      headers['x-user-name'] = encodeURIComponent(user.name || '');
    }

    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/community/posts/${id}`,
      headers,
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 게시글 작성 (인증 필수)
   * Create post (requires auth)
   */
  @Post('posts')
  @ApiOperation({ summary: '커뮤니티 게시글 작성', description: '새 게시글을 작성합니다' })
  @ApiResponse({ status: 201, description: '게시글 작성 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async createPost(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/community/posts',
      data: body,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 게시글 수정 (인증 필수, 작성자만)
   * Update post (requires auth, author only)
   */
  @Put('posts/:id')
  @ApiOperation({ summary: '커뮤니티 게시글 수정', description: '게시글을 수정합니다. 작성자만 가능합니다' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiResponse({ status: 200, description: '게시글 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  async updatePost(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'PUT',
      url: `/community/posts/${id}`,
      data: body,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 게시글 삭제 (인증 필수, 작성자 또는 관리자)
   * Delete post (requires auth, author or admin)
   */
  @Delete('posts/:id')
  @ApiOperation({ summary: '커뮤니티 게시글 삭제', description: '게시글을 삭제합니다. 작성자 또는 관리자만 가능합니다' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiResponse({ status: 200, description: '게시글 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  async deletePost(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/community/posts/${id}`,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 게시글 좋아요 토글 (인증 필수)
   * Toggle post like (requires auth)
   */
  @Post('posts/:id/like')
  @ApiOperation({ summary: '게시글 좋아요 토글', description: '게시글에 대한 좋아요를 추가하거나 취소합니다' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiResponse({ status: 200, description: '좋아요 상태 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  async togglePostLike(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/community/posts/${id}/like`,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 조회수 증가 (인증 불필요)
   * Increment view count (no auth required)
   */
  // 조회수 조작 방지를 위해 ThrottlerGuard로 1분당 10회 제한
  // ThrottlerGuard limits to 10/min to prevent view count manipulation
  @Post('posts/:id/view')
  @OptionalAuth()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '게시글 조회수 증가', description: '게시글의 조회수를 1 증가시킵니다' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiResponse({ status: 200, description: '조회수 증가 성공' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  async incrementViewCount(@Param('id') id: string, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/community/posts/${id}/view`,
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 댓글 작성 (인증 필수)
   * Create comment (requires auth)
   */
  @Post('posts/:id/comments')
  @ApiOperation({ summary: '댓글 작성', description: '게시글에 새 댓글을 작성합니다. parentId를 전달하면 대댓글이 됩니다' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiResponse({ status: 201, description: '댓글 작성 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  async createComment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/community/posts/${id}/comments`,
      data: body,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 댓글 삭제 (인증 필수, 작성자 또는 관리자)
   * Delete comment (requires auth, author or admin)
   */
  @Delete('comments/:id')
  @ApiOperation({ summary: '댓글 삭제', description: '댓글을 삭제합니다. 작성자 또는 관리자만 가능합니다' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '댓글 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 부족' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  async deleteComment(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/community/comments/${id}`,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 댓글 좋아요 토글 (인증 필수)
   * Toggle comment like (requires auth)
   */
  @Post('comments/:id/like')
  @ApiOperation({ summary: '댓글 좋아요 토글', description: '댓글에 대한 좋아요를 추가하거나 취소합니다' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '좋아요 상태 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  async toggleCommentLike(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/community/comments/${id}/like`,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 독립적 이미지 업로드 (인증 필수) — 게시글 ID 없이 에디터 이미지 업로드
   * Standalone image upload (requires auth) — upload editor image without post ID
   */
  @Post('upload-image')
  @ApiOperation({ summary: '에디터 이미지 업로드', description: '게시글 ID 없이 에디터에서 이미지를 업로드합니다' })
  @ApiResponse({ status: 201, description: '이미지 업로드 성공' })
  @ApiResponse({ status: 400, description: '유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async uploadImage(
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // SEC-26-11: 게이트웨이 레벨에서 이미지 파일 타입/크기 사전 검증 — 허용되지 않는 파일이 다운스트림으로 전달되는 것을 방지
    // SEC-26-11: Pre-validate image file type/size at gateway level — prevents disallowed files from reaching downstream
    const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    const imagePayload = body as { data?: string; mimeType?: string; type?: string; size?: number } | undefined;
    if (imagePayload?.mimeType && !ALLOWED_IMAGE_MIMES.includes(imagePayload.mimeType)) {
      return res.status(400).json({ message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' });
    }
    if (imagePayload?.type && !ALLOWED_IMAGE_MIMES.includes(imagePayload.type)) {
      return res.status(400).json({ message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' });
    }
    if (imagePayload?.data && typeof imagePayload.data === 'string') {
      const estimatedBytes = Math.ceil((imagePayload.data.length * 3) / 4);
      if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
        return res.status(400).json({ message: 'Image size exceeds 10MB limit' });
      }
    }
    if (imagePayload?.size && imagePayload.size > MAX_IMAGE_SIZE_BYTES) {
      return res.status(400).json({ message: 'Image size exceeds 10MB limit' });
    }

    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/community/upload-image',
      data: body,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 첨부파일 업로드 (인증 필수)
   * Upload attachment (requires auth)
   */
  @Post('posts/:id/attachments')
  @ApiOperation({ summary: '커뮤니티 첨부파일 업로드', description: 'base64 인코딩된 파일을 업로드합니다' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiResponse({ status: 201, description: '첨부파일 업로드 성공' })
  async uploadAttachment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // SEC-26-11: 게이트웨이 레벨에서 첨부파일 타입/크기 사전 검증 — 불필요한 프록시 전달 방지
    // SEC-26-11: Pre-validate attachment file type/size at gateway level — prevents unnecessary proxy forwarding
    const ALLOWED_ATTACHMENT_MIMES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    const attachPayload = body as { data?: string; mimeType?: string; type?: string; size?: number } | undefined;
    if (attachPayload?.mimeType && !ALLOWED_ATTACHMENT_MIMES.includes(attachPayload.mimeType)) {
      return res.status(400).json({ message: 'File type not allowed' });
    }
    if (attachPayload?.type && !ALLOWED_ATTACHMENT_MIMES.includes(attachPayload.type)) {
      return res.status(400).json({ message: 'File type not allowed' });
    }
    if (attachPayload?.data && typeof attachPayload.data === 'string') {
      const estimatedBytes = Math.ceil((attachPayload.data.length * 3) / 4);
      if (estimatedBytes > MAX_ATTACHMENT_SIZE_BYTES) {
        return res.status(400).json({ message: 'File size exceeds 10MB limit' });
      }
    }
    if (attachPayload?.size && attachPayload.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return res.status(400).json({ message: 'File size exceeds 10MB limit' });
    }

    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/community/posts/${id}/attachments`,
      data: body,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 첨부파일 삭제 (인증 필수)
   * Delete attachment (requires auth)
   */
  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: '커뮤니티 첨부파일 삭제', description: '첨부파일을 삭제합니다' })
  @ApiParam({ name: 'attachmentId', description: '첨부파일 ID' })
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as { id: string; role?: string; name?: string };
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/community/attachments/${attachmentId}`,
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role || '',
        'x-user-name': encodeURIComponent(user.name || ''),
      },
    });
    return res.status(result.status).json(result.data);
  }

  /**
   * 첨부파일 다운로드 (공개)
   * Download community attachment file (public)
   */
  @Get('uploads/:fileName')
  @OptionalAuth()
  @ApiOperation({ summary: '커뮤니티 첨부파일 다운로드', description: '커뮤니티 게시글 첨부파일을 제공합니다' })
  @ApiParam({ name: 'fileName', description: '파일명' })
  async serveFile(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    // PROXY-L-01: 디렉토리 트래버설 방지 — 파일명에서 경로 부분 제거
    // PROXY-L-01: Prevent directory traversal — strip path components from filename
    const safeName = path.basename(fileName);
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/community/uploads/${safeName}`,
      responseType: 'arraybuffer',
    });
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }
    // 바이너리 응답(이미지/파일) — JSON이 아닌 원본 버퍼를 클라이언트에 전달
    // Binary response (image/file) — pass raw buffer to client instead of JSON
    const contentType = result.headers?.['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    return res.send(Buffer.from(result.data as ArrayBuffer));
  }
}
