/**
 * @file 프로필 컨트롤러
 * @description 마이페이지: 프로필 수정, 비밀번호 변경
 *
 * @file Profile Controller
 * @description My Page: profile update, password change
 */
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../../infrastructure/config/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/config/current-user.decorator';
import { UserDto } from '@virtuex/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@Controller('profile')
@UseGuards(InternalAuthGuard, JwtAuthGuard)
export class ProfileController {
  constructor(private readonly prisma: PrismaService) {}

  /** 내 프로필 조회 (민감 정보 마스킹)
   * Get my profile (sensitive data masked) */
  @Get()
  async getProfile(@CurrentUser() user: UserDto) {
    const raw = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        addressDetail: true,
        zipCode: true,
        isActive: true,
        approvalStatus: true,
        totpEnabled: true,
        encryptedRrn: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // 민감 데이터 마스킹 — 존재 여부만 노출 (Mask sensitive data — expose only existence)
    const profile = raw ? {
      ...raw,
      encryptedRrn: raw.encryptedRrn ? '***' : null,
    } : null;
    return { success: true, data: profile };
  }

  /** 프로필 정보 수정 (이름, 전화번호, 주소)
   * Update profile (name, phone, address) */
  @Put()
  async updateProfile(
    @CurrentUser() user: UserDto,
    @Body() body: { name?: string; phone?: string; address?: string; addressDetail?: string; zipCode?: string },
  ) {
    const data: Record<string, string> = {};
    if (body.name) data.name = body.name;
    if (body.phone) {
      // 전화번호 형식 검증 (한국 형식) / Validate phone format (Korean format)
      const phoneRegex = /^01[016789]-?\d{3,4}-?\d{4}$/;
      if (!phoneRegex.test(body.phone)) {
        throw new BadRequestException('Invalid phone number format');
      }
      data.phone = body.phone;
    }
    if (body.address) data.address = body.address;
    if (body.addressDetail !== undefined) data.addressDetail = body.addressDetail;
    if (body.zipCode) data.zipCode = body.zipCode;

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        addressDetail: true,
        zipCode: true,
        isActive: true,
        approvalStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { success: true, data: updated };
  }

  /**
   * 비밀번호 변경 — 현재 비밀번호 검증 후 새 비밀번호로 변경
   * bcrypt 라운드 12로 해싱하여 보안 강화
   *
   * Change password — verify current password, then update to new one
   * Hash with bcrypt round 12 for enhanced security
   */
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: UserDto,
    @Body() body: { currentPassword: string; newPassword: string; confirmPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword || !body.confirmPassword) {
      throw new BadRequestException('All password fields are required');
    }
    if (body.newPassword !== body.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }
    if (body.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    // 비밀번호 복잡도 검증: 영문+숫자+특수문자 포함 / Password complexity: must include letter, number, special char
    const complexityRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!complexityRegex.test(body.newPassword)) {
      throw new BadRequestException('Password must contain at least one letter, one number, and one special character');
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new BadRequestException('User not found');

    const isValid = await bcrypt.compare(body.currentPassword, dbUser.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(body.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Password changed successfully' };
  }
}
