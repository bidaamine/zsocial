import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BrandingService } from './branding.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import type { CampaignStatus } from './entities/campaign.entity';

@UseGuards(ZeroTrustGuard)
@Controller('companies/:companyId')
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  private auth(req: any): string | undefined {
    return req.headers.authorization;
  }

  // ── Brands ──
  @Post('brands')
  async createBrand(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() body: { name: string; tagline?: string; palette?: Record<string, string>; typography?: Record<string, string>; voice?: string },
  ) {
    return this.branding.createBrand(companyId, req.user.sub, this.auth(req), body);
  }

  @Get('brands')
  async listBrands(@Param('companyId') companyId: string, @Request() req: any) {
    return this.branding.listBrands(companyId, req.user.sub, this.auth(req));
  }

  @Post('brands/generate')
  async generate(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() body: { name?: string; positioning?: string },
  ) {
    return this.branding.generateBrandSuggestions(companyId, req.user.sub, this.auth(req), body);
  }

  // ── Campaigns ──
  @Post('campaigns')
  async createCampaign(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() body: { name: string; goal: string; channels?: string[]; brandId?: string },
  ) {
    return this.branding.createCampaign(companyId, req.user.sub, this.auth(req), body);
  }

  @Get('campaigns')
  async listCampaigns(@Param('companyId') companyId: string, @Request() req: any) {
    return this.branding.listCampaigns(companyId, req.user.sub, this.auth(req));
  }
}

@UseGuards(ZeroTrustGuard)
@Controller()
export class BrandingResourceController {
  constructor(private readonly branding: BrandingService) {}

  private auth(req: any): string | undefined {
    return req.headers.authorization;
  }

  @Get('brands/:id')
  async getBrand(@Param('id') id: string, @Request() req: any) {
    return this.branding.getBrand(id, req.user.sub, this.auth(req));
  }

  @Put('brands/:id')
  async updateBrand(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.branding.updateBrand(id, req.user.sub, this.auth(req), body);
  }

  @Get('campaigns/:id')
  async getCampaign(@Param('id') id: string, @Request() req: any) {
    return this.branding.getCampaign(id, req.user.sub, this.auth(req));
  }

  @Put('campaigns/:id/status')
  async updateStatus(@Param('id') id: string, @Request() req: any, @Body('status') status: CampaignStatus) {
    return this.branding.updateCampaignStatus(id, req.user.sub, this.auth(req), status);
  }

  // --- Kafka consumer for GDPR deletion ---
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.branding.deleteUserData(data.userId);
  }
}
