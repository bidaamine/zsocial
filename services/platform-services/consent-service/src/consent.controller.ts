import { Controller, Get, Post, Body, Query, ForbiddenException, UseGuards, Req } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { ZeroTrustGuard } from './zero-trust.guard';

@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('check')
  @UseGuards(ZeroTrustGuard)
  async checkConsent(
    @Req() req: any,
    @Query('userId') userId: string,
    @Query('action') action: string,
  ) {
    // Zero-Trust context check: user can only query their own consent, unless they are admin/system
    if (
      req.user.sub !== userId &&
      !req.user.roles?.includes('admin') &&
      !req.user.roles?.includes('system')
    ) {
      throw new ForbiddenException('Access Denied: Cannot query consent for other users');
    }

    const isAllowed = await this.consentService.verifyConsent(userId, action as any);
    return { allowed: isAllowed };
  }

  @Post('update')
  @UseGuards(ZeroTrustGuard)
  async updateConsent(
    @Req() req: any,
    @Body() body: { userId: string; updates: any },
  ) {
    // Zero-Trust context check: user can only update their own consent, unless they are admin/system
    if (
      req.user.sub !== body.userId &&
      !req.user.roles?.includes('admin') &&
      !req.user.roles?.includes('system')
    ) {
      throw new ForbiddenException('Access Denied: Cannot update consent for other users');
    }

    const updated = await this.consentService.updateConsent(body.userId, body.updates);
    return { status: 'updated', record: updated };
  }
}
