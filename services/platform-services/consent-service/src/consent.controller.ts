import { Controller, Get, Post, Body, Query, ForbiddenException } from '@nestjs/common';
import { ConsentService } from './consent.service';

@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('check')
  async checkConsent(@Query('userId') userId: string, @Query('action') action: string) {
    const isAllowed = await this.consentService.verifyConsent(userId, action as any);
    if (!isAllowed) {
        throw new ForbiddenException(`Consent not granted for action: ${action}`);
    }
    return { allowed: true };
  }

  @Post('update')
  async updateConsent(@Body() body: { userId: string, updates: any }) {
    await this.consentService.updateConsent(body.userId, body.updates);
    return { status: 'updated' };
  }
}
