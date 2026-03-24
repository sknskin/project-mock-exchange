/**
 * @file 관리자 프록시 컨트롤러
 * @description API Gateway에서 User Auth 서비스의 관리자 API로 프록시
 *
 * @file Admin Proxy Controller
 * @description Proxies admin API requests to User Auth service
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRolesGuard } from '../auth/admin-roles.guard';
import { ChatGateway } from '../gateway/chat.gateway';

// JwtAuthGuard + AdminRolesGuard 이중 가드 — 인증 + 관리자 역할 모두 검증
// Dual guard: JwtAuthGuard (authentication) + AdminRolesGuard (admin role authorization)
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminProxyController {
  // 관리자 감사 로그용 Logger 인스턴스
  // Logger instance for admin audit logging
  private readonly logger = new Logger('AdminAudit');

  constructor(
    private readonly proxyService: ProxyService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /** 사용자 목록 조회를 user-auth 관리자 API로 프록시
   * Proxy user list to user-auth admin API */
  @Get('users')
  @ApiOperation({ summary: '사용자 목록 조회', description: '관리자 권한으로 전체 사용자 목록을 페이징, 필터링, 검색 조건과 함께 조회합니다' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  @ApiQuery({ name: 'status', required: false, description: '사용자 상태 필터 (active, inactive, pending 등)' })
  @ApiQuery({ name: 'role', required: false, description: '사용자 역할 필터' })
  @ApiQuery({ name: 'search', required: false, description: '검색어 (이름, 이메일 등)' })
  @ApiResponse({ status: 200, description: '사용자 목록 반환 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  async listUsers(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/admin/users',
      params: req.query,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 사용자 상세 조회를 user-auth 관리자 API로 프록시
   * Proxy user detail to user-auth admin API */
  @Get('users/:id')
  @ApiOperation({ summary: '사용자 상세 조회', description: '관리자 권한으로 특정 사용자의 상세 정보를 조회합니다' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '사용자 상세 정보 반환 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async getUserDetail(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: `/admin/users/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(result.status).json(result.data);
  }

  /** 가입 승인을 user-auth로 프록시하고 WebSocket 알림 전송
   * Proxy registration approval to user-auth and notify via WebSocket */
  @Post('users/:id/approve')
  @ApiOperation({ summary: '가입 승인', description: '관리자가 대기 중인 사용자의 가입 요청을 승인합니다' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '가입 승인 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (이미 승인된 사용자 등)' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async approveUser(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const adminId = (req as unknown as { user?: { id: string } }).user?.id;
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/admin/users/${id}/approve`,
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    // 승인 성공 시 해당 사용자에게 WebSocket 알림 전송 / On approval, notify the user via WebSocket
    if (result.status < 400) {
      // 관리자 감사 로그: 가입 승인 / Admin audit log: user approval
      this.logger.warn(`[ADMIN_AUDIT] admin=${adminId} action=APPROVE_USER target=${id}`, 'AdminAudit');
      this.chatGateway.notifyUser(id, 'notification:registration-approved', {
        type: 'registration-approved',
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(result.status).json(result.data);
  }

  /** 가입 거절을 user-auth로 프록시하고 WebSocket 알림 전송
   * Proxy registration rejection to user-auth and notify via WebSocket */
  @Post('users/:id/reject')
  @ApiOperation({ summary: '가입 거절', description: '관리자가 대기 중인 사용자의 가입 요청을 거절합니다' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '가입 거절 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (이미 처리된 사용자 등)' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async rejectUser(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const adminId = (req as unknown as { user?: { id: string } }).user?.id;
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/admin/users/${id}/reject`,
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    // 거절 시 해당 사용자에게 사유와 함께 WebSocket 알림 전송 / On rejection, notify user with reason via WebSocket
    if (result.status < 400) {
      // 관리자 감사 로그: 가입 거절 / Admin audit log: user rejection
      this.logger.warn(`[ADMIN_AUDIT] admin=${adminId} action=REJECT_USER target=${id}`, 'AdminAudit');
      this.chatGateway.notifyUser(id, 'notification:registration-rejected', {
        type: 'registration-rejected',
        reason: body.reason || '',
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(result.status).json(result.data);
  }

  /** 사용자 비활성화를 user-auth 관리자 API로 프록시
   * Proxy user deactivation to user-auth admin API */
  @Post('users/:id/deactivate')
  @ApiOperation({ summary: '사용자 비활성화', description: '관리자가 특정 사용자 계정을 비활성화합니다' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '비활성화 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (이미 비활성 상태 등)' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async deactivateUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const adminId = (req as unknown as { user?: { id: string } }).user?.id;
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/admin/users/${id}/deactivate`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    if (result.status < 400) {
      // 관리자 감사 로그: 사용자 비활성화 / Admin audit log: user deactivation
      this.logger.warn(`[ADMIN_AUDIT] admin=${adminId} action=DEACTIVATE_USER target=${id}`, 'AdminAudit');
    }
    return res.status(result.status).json(result.data);
  }

  /** 사용자 활성화를 user-auth 관리자 API로 프록시
   * Proxy user activation to user-auth admin API */
  @Post('users/:id/activate')
  @ApiOperation({ summary: '사용자 활성화', description: '관리자가 비활성화된 사용자 계정을 다시 활성화합니다' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '활성화 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (이미 활성 상태 등)' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async activateUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const adminId = (req as unknown as { user?: { id: string } }).user?.id;
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/admin/users/${id}/activate`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    if (result.status < 400) {
      // 관리자 감사 로그: 사용자 활성화 / Admin audit log: user activation
      this.logger.warn(`[ADMIN_AUDIT] admin=${adminId} action=ACTIVATE_USER target=${id}`, 'AdminAudit');
    }
    return res.status(result.status).json(result.data);
  }

  /** 계정 잠금 해제를 user-auth 관리자 API로 프록시
   * Proxy account unlock to user-auth admin API */
  @Post('users/:id/unlock')
  @ApiOperation({ summary: '계정 잠금 해제', description: '관리자가 잠긴 사용자 계정의 잠금을 해제합니다' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '잠금 해제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async unlockUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const adminId = (req as unknown as { user?: { id: string } }).user?.id;
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: `/admin/users/${id}/unlock`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    if (result.status < 400) {
      // 관리자 감사 로그: 계정 잠금 해제 / Admin audit log: account unlock
      this.logger.warn(`[ADMIN_AUDIT] admin=${adminId} action=UNLOCK_USER target=${id}`, 'AdminAudit');
    }
    return res.status(result.status).json(result.data);
  }

  /** 사용자 삭제를 user-auth 관리자 API로 프록시
   * Proxy user deletion to user-auth admin API */
  @Delete('users/:id')
  @ApiOperation({ summary: '사용자 삭제', description: '관리자가 특정 사용자 계정을 영구 삭제합니다' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '사용자 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async deleteUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const adminId = (req as unknown as { user?: { id: string } }).user?.id;
    const result = await this.proxyService.forward('user-auth', {
      method: 'DELETE',
      url: `/admin/users/${id}`,
      headers: { Authorization: req.headers.authorization || '' },
    });
    if (result.status < 400) {
      // 관리자 감사 로그: 사용자 삭제 / Admin audit log: user deletion
      this.logger.warn(`[ADMIN_AUDIT] admin=${adminId} action=DELETE_USER target=${id}`, 'AdminAudit');
    }
    return res.status(result.status).json(result.data);
  }

  /** 사용자 역할 변경을 user-auth 관리자 API로 프록시
   * Proxy user role update to user-auth admin API */
  @Patch('users/:id/role')
  @ApiOperation({ summary: '사용자 역할 변경', description: '관리자가 특정 사용자의 역할(권한)을 변경합니다' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '역할 변경 성공' })
  @ApiResponse({ status: 400, description: '잘못된 역할 값' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: { role: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const adminId = (req as unknown as { user?: { id: string } }).user?.id;
    const result = await this.proxyService.forward('user-auth', {
      method: 'PATCH',
      url: `/admin/users/${id}/role`,
      data: body,
      headers: { Authorization: req.headers.authorization || '' },
    });
    if (result.status < 400) {
      // 관리자 감사 로그: 역할 변경 / Admin audit log: role change
      this.logger.warn(`[ADMIN_AUDIT] admin=${adminId} action=CHANGE_ROLE target=${id} newRole=${body.role}`, 'AdminAudit');
    }
    return res.status(result.status).json(result.data);
  }
}
