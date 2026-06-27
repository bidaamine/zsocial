import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ChildSafetyService } from './child-safety.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { AgeGateGuard, MinAge } from './age-gate.guard';

@Controller('child-safety')
export class ChildSafetyController {
  constructor(private readonly safetyService: ChildSafetyService) {}

  @UseGuards(ZeroTrustGuard)
  @Post('delegate')
  async registerParentDelegate(@Request() req: any, @Body('childId') childId: string) {
    return this.safetyService.registerDelegate(req.user.sub, childId);
  }

  @UseGuards(ZeroTrustGuard)
  @Post('coppa-consent')
  async coppaConsent(
    @Request() req: any,
    @Body('childId') childId: string,
    @Body('coppaConsentGranted') coppaConsentGranted: boolean,
  ) {
    return this.safetyService.grantCoppaConsent(req.user.sub, childId, coppaConsentGranted);
  }

  @UseGuards(ZeroTrustGuard)
  @Get('delegates')
  async getMyDelegates(@Request() req: any) {
    return this.safetyService.getDelegatesByParent(req.user.sub);
  }

  @UseGuards(ZeroTrustGuard)
  @Post('scan')
  async scanMessageText(@Body('childId') childId: string, @Body('text') text: string) {
    return this.safetyService.scanText(childId, text);
  }

  @UseGuards(ZeroTrustGuard)
  @Get('incidents/:childId')
  async getChildIncidents(@Param('childId') childId: string, @Request() req: any) {
    return this.safetyService.getIncidentsForChild(childId, req.user.sub, req.user.roles);
  }

  // --- Age-Gated Resource Route ---
  @UseGuards(ZeroTrustGuard, AgeGateGuard)
  @MinAge(18)
  @Get('age-gated-resource')
  async getAdultResource() {
    return { success: true, message: 'Welcome. Access to this adult-restricted content is authorized.' };
  }

  // --- Kafka consumer ---
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.safetyService.deleteChildData(data.userId);
  }
}
