/**
 * @file 관리자 컨트롤러
 * @description 사용자 관리 API (목록, 상세, 승인, 반려, 비활성화, 삭제)
 *
 * @file Admin Controller
 * @description User management API: list, detail, approve, reject, deactivate, delete
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { AdminService } from '../../application/services/admin.service';
import { UserDto, USER_ROLE } from '@virtuex/common';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@Controller('admin')
@UseGuards(InternalAuthGuard, JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private assertAdmin(user: UserDto) {
    if (user.role !== USER_ROLE.SYSTEM && user.role !== USER_ROLE.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('users')
  async listUsers(
    @CurrentUser() user: UserDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    this.assertAdmin(user);
    const result = await this.adminService.listUsers({
      page,
      limit,
      search,
      role,
      status,
    });
    return { success: true, data: result };
  }

  @Get('users/:id')
  async getUserDetail(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    this.assertAdmin(user);
    const result = await this.adminService.getUserDetail(id);
    return { success: true, data: result };
  }

  @Post('users/:id/approve')
  async approveUser(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    this.assertAdmin(user);
    const result = await this.adminService.approveUser(id, user.id, user.role, note);
    return { success: true, data: result };
  }

  @Post('users/:id/reject')
  async rejectUser(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    this.assertAdmin(user);
    const result = await this.adminService.rejectUser(id, user.id, user.role, note);
    return { success: true, data: result };
  }

  @Post('users/:id/deactivate')
  async deactivateUser(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    this.assertAdmin(user);
    const result = await this.adminService.deactivateUser(id, user.role);
    return { success: true, data: result };
  }

  @Post('users/:id/activate')
  async activateUser(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    this.assertAdmin(user);
    const result = await this.adminService.activateUser(id, user.role);
    return { success: true, data: result };
  }

  @Delete('users/:id')
  async deleteUser(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    this.assertAdmin(user);
    await this.adminService.deleteUser(id, user.role);
    return { success: true, message: 'User deleted' };
  }

  @Post('users/:id/unlock')
  async unlockUser(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
  ) {
    this.assertAdmin(user);
    const result = await this.adminService.unlockUser(id, user.role);
    return { success: true, data: result };
  }

  @Patch('users/:id/role')
  async updateRole(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    this.assertAdmin(user);
    const result = await this.adminService.updateRole(id, body.role, user.role);
    return { success: true, data: result };
  }
}
