import { Controller, Post, Body, UseGuards, Request, Ip, Headers, BadRequestException } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';

@Controller('mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService
  ) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(@Request() req: any) {
    const userId = req.user.userId;
    return this.mfaService.generateTotpSecret(userId);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verify(@Request() req: any, @Body('token') token: string) {
    const userId = req.user.userId;
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.mfaService.verifyTotpToken(userId, token);
  }

  @Post('login')
  async login(
    @Body() body: { userId: string; token: string; deviceFingerprint?: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    if (!body.userId || !body.token) {
      throw new BadRequestException('userId and token are required');
    }
    const isVerified = await this.mfaService.validateMfaLogin(body.userId, body.token);
    const fingerprint = body.deviceFingerprint || userAgent || 'unknown';
    return this.authService.mfaLogin(body.userId, isVerified, fingerprint, ip);
  }
}
