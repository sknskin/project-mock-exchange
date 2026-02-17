import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/auth')
export class AuthProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('register')
  async register(@Body() body: unknown, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/register',
      data: body,
    });
    return res.status(result.status).json(result.data);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/login',
      data: body,
      headers: {
        Cookie: req.headers.cookie || '',
      },
    });

    // Forward Set-Cookie headers from user-auth
    const setCookieHeader = (result.data as Record<string, unknown>)?.['set-cookie'];
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader as string);
    }

    return res.status(result.status).json(result.data);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/refresh',
      headers: {
        Cookie: req.headers.cookie || '',
      },
    });
    return res.status(result.status).json(result.data);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'POST',
      url: '/auth/logout',
      headers: {
        Cookie: req.headers.cookie || '',
      },
    });
    res.clearCookie('refresh_token', { path: '/auth' });
    return res.status(result.status).json(result.data);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request, @Res() res: Response) {
    const result = await this.proxyService.forward('user-auth', {
      method: 'GET',
      url: '/auth/me',
      headers: {
        Authorization: req.headers.authorization || '',
      },
    });
    return res.status(result.status).json(result.data);
  }
}
