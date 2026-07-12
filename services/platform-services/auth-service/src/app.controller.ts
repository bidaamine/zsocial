import { Controller, Get, Post, Put, Delete, Body, Req, Query, Param, UseGuards, Ip, Headers, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { UserArchetype } from './entities/user.entity';

@Controller('api/auth')
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  getHealth(): string {
    return 'auth-service is healthy and operational.';
  }

  @Post('register')
  async register(
    @Body() body: { email: string; password?: string; passwordHash?: string; archetype?: UserArchetype }
  ) {
    const pwd = body.password || body.passwordHash;
    if (!body.email || !pwd) {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.register(body.email, pwd, body.archetype || 'personal');
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }
    return this.authService.verifyEmail(token);
  }

  @Post('login')
  async login(
    @Body() body: { email?: string; password?: string; deviceFingerprint?: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }

    const fingerprint = body.deviceFingerprint || userAgent || 'unknown';
    return this.authService.login(body.email, body.password, fingerprint, ip);
  }

  @Post('refresh')
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Body('deviceFingerprint') deviceFingerprint: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    const fingerprint = deviceFingerprint || userAgent || 'unknown';
    return this.authService.refresh(refreshToken, fingerprint, ip);
  }

  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.logout(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@Req() req: any) {
    return this.authService.getActiveSessions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@Req() req: any, @Param('id') sessionId: string) {
    return this.authService.revokeSession(req.user.userId, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/other')
  async revokeOtherSessions(@Req() req: any, @Body('refreshToken') currentRefreshToken: string) {
    if (!currentRefreshToken) {
      throw new BadRequestException('Current refresh token is required');
    }
    return this.authService.revokeOtherSessions(req.user.userId, currentRefreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('devices')
  async getDevices(@Req() req: any) {
    return this.authService.getTrustedDevices(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('devices/:id/trust')
  async toggleDeviceTrust(
    @Req() req: any,
    @Param('id') deviceId: string,
    @Body('isTrusted') isTrusted: boolean,
  ) {
    return this.authService.toggleDeviceTrust(req.user.userId, deviceId, isTrusted);
  }

  @Get('status')
  async getStatus(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return { valid: false };
    try {
      const payload = await this.authService.validateToken(token);
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }

  @Get('.well-known/jwks.json')
  getJwks() {
    return this.authService.getJwks();
  }

  @Get('public-key')
  getPublicKey() {
    return this.authService.getPublicKey();
  }
}
