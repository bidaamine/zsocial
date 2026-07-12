import { Controller, Post, Body, Headers, Ip, BadRequestException, UseGuards } from '@nestjs/common';
import { ThreatDetectionService } from './threat-detection.service';
import { ZkpService } from './zkp.service';
import { ZeroTrustGuard } from './zero-trust.guard';

// Zero-Trust by default: every endpoint must present a valid RS256 token. The child
// encrypt/decrypt routes handle minor cleartext and must never be reachable unauthenticated.
@UseGuards(ZeroTrustGuard)
@Controller('security')
export class SecurityController {
  constructor(
    private readonly threatService: ThreatDetectionService,
    private readonly zkpService: ZkpService,
  ) {}

  @Post('assess-risk')
  async assessRisk(
    @Body() body: { userId: string; action: string; ip?: string },
    @Ip() ip: string,
    @Headers('x-forwarded-for') forwardedIp: string,
  ) {
    // Allow manual IP overriding in body for testing simulation
    const clientIp = body.ip || forwardedIp || ip || '127.0.0.1';
    const score = await this.threatService.assessRisk(
      clientIp,
      body.action || 'unknown',
      body.userId || 'anonymous',
    );
    return { riskScore: score };
  }

  @Post('encrypt-child')
  encryptChild(
    @Body() body: { data: any },
    @Headers('x-parent-cryptographic-key') parentKey: string,
  ) {
    if (!parentKey || parentKey.length !== 64) {
      throw new BadRequestException('Valid 32-byte parent cryptographic key (64 hex characters) required in headers.');
    }
    return this.zkpService.encryptChildData(body.data, parentKey);
  }

  @Post('decrypt-child')
  decryptChild(
    @Body() body: { encryptedPayload: any },
    @Headers('x-parent-cryptographic-key') parentKey: string,
  ) {
    if (!parentKey || parentKey.length !== 64) {
      throw new BadRequestException('Valid 32-byte parent cryptographic key (64 hex characters) required in headers.');
    }
    return this.zkpService.decryptChildData(body.encryptedPayload, parentKey);
  }
}
