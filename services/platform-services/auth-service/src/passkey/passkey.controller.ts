import { Controller, Post, Body, Get, Query, UseGuards, Request, Ip, Headers, BadRequestException } from '@nestjs/common';
import { PasskeyService } from './passkey.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';

@Controller('passkey')
export class PasskeyController {
  constructor(private readonly passkeyService: PasskeyService) {}

  @Get('register/generate')
  @UseGuards(JwtAuthGuard)
  async generateRegistrationOptions(@Request() req: any) {
    const userId = req.user.userId;
    return this.passkeyService.generateRegistrationOptions(userId);
  }

  @Post('register/verify')
  @UseGuards(JwtAuthGuard)
  async verifyRegistrationResponse(
    @Request() req: any,
    @Body() body: { response: RegistrationResponseJSON }
  ) {
    const userId = req.user.userId;
    if (!body.response) {
      throw new BadRequestException('Response is required');
    }
    return this.passkeyService.verifyRegistrationResponse(userId, body.response);
  }

  @Get('auth/generate')
  async generateAuthenticationOptions(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.passkeyService.generateAuthenticationOptions(email);
  }

  @Post('auth/verify')
  async verifyAuthenticationResponse(
    @Body() body: { email: string; response: AuthenticationResponseJSON; deviceFingerprint?: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    if (!body.email || !body.response) {
      throw new BadRequestException('Email and response are required');
    }
    const fingerprint = body.deviceFingerprint || userAgent || 'unknown';
    return this.passkeyService.verifyAuthenticationResponse(body.email, body.response, fingerprint, ip);
  }
}
