import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { Campaign, CampaignStatus } from './entities/campaign.entity';

@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);
  private readonly companyUrl = process.env.COMPANY_SERVICE_URL || 'http://localhost:4120';
  private readonly routerUrl = process.env.AI_MODEL_ROUTER_URL || 'http://localhost:4703';

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
  ) {}

  // ── Multi-tenant access: verify membership via company-service ─────
  private async assertMember(companyId: string, authHeader?: string): Promise<void> {
    try {
      const res = await fetch(`${this.companyUrl}/api/companies/${companyId}`, {
        headers: authHeader ? { authorization: authHeader } : {},
      });
      if (res.ok) return;
    } catch (err: any) {
      this.logger.error(`Company membership check failed: ${err.message}`);
    }
    // Fail closed: no confirmed membership → deny.
    throw new ForbiddenException('Access denied: you are not a member of this company (or it could not be verified).');
  }

  /** Route a generation prompt through ai-model-router; returns text or null on failure. */
  private async callRouter(prompt: string, userId?: string): Promise<{ text: string; model: string } | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`${this.routerUrl}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          task_type: 'generation',
          latency_priority: 'balanced',
          privacy_sensitivity: 'public',
          cost_envelope: 'balanced',
          domain: 'general',
          user_id: userId,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`router HTTP ${res.status}`);
      const data: any = await res.json();
      const text = (data?.response_text || '').trim();
      if (!text) throw new Error('empty router response');
      return { text, model: data?.routed_model || 'ai-model-router' };
    } catch (err: any) {
      this.logger.warn(`Brand/campaign generation via model-router failed: ${err.message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Brand kit ─────────────────────────────────────────────────────
  async createBrand(
    companyId: string,
    userId: string,
    authHeader: string | undefined,
    data: { name: string; tagline?: string; palette?: Record<string, string>; typography?: Record<string, string>; voice?: string },
  ): Promise<Brand> {
    await this.assertMember(companyId, authHeader);
    return this.brandRepo.save(
      this.brandRepo.create({
        companyId,
        name: data.name,
        tagline: data.tagline,
        palette: data.palette || {},
        typography: data.typography || {},
        voice: data.voice,
        createdBy: userId,
      }),
    );
  }

  async listBrands(companyId: string, userId: string, authHeader?: string): Promise<Brand[]> {
    await this.assertMember(companyId, authHeader);
    return this.brandRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async getBrand(id: string, userId: string, authHeader?: string): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    await this.assertMember(brand.companyId, authHeader);
    return brand;
  }

  async updateBrand(
    id: string,
    userId: string,
    authHeader: string | undefined,
    data: Partial<Pick<Brand, 'name' | 'tagline' | 'palette' | 'typography' | 'voice'>>,
  ): Promise<Brand> {
    const brand = await this.getBrand(id, userId, authHeader);
    Object.assign(brand, {
      name: data.name ?? brand.name,
      tagline: data.tagline ?? brand.tagline,
      palette: data.palette ?? brand.palette,
      typography: data.typography ?? brand.typography,
      voice: data.voice ?? brand.voice,
    });
    return this.brandRepo.save(brand);
  }

  /** AI Brand Identity Builder: generate naming/tagline/voice/palette suggestions. */
  async generateBrandSuggestions(
    companyId: string,
    userId: string,
    authHeader: string | undefined,
    input: { name?: string; positioning?: string },
  ): Promise<{ suggestion: string; generatedBy: string }> {
    await this.assertMember(companyId, authHeader);
    const prompt =
      'You are an AI brand identity builder. Propose a concise brand kit: 3 name/tagline options, a 3-colour palette ' +
      '(hex), a heading/body type pairing, and 2-3 lines of brand voice guidance. ' +
      `Working name: "${input.name || 'unnamed'}". Positioning: "${input.positioning || 'not specified'}".`;
    const ai = await this.callRouter(prompt, userId);
    if (ai) return { suggestion: ai.text, generatedBy: ai.model };
    // Deterministic fallback when the router is unavailable.
    return {
      generatedBy: 'template',
      suggestion:
        `Brand starter for "${input.name || 'your company'}":\n` +
        '- Names/taglines: keep it short, evocative, and ownable.\n' +
        '- Palette: primary #0EA5E9, accent #F97316, neutral #0F172A.\n' +
        '- Type: Inter for headings and body.\n' +
        `- Voice: ${input.positioning ? `lean into "${input.positioning}" — ` : ''}clear, warm, confident.`,
    };
  }

  // ── Campaigns ─────────────────────────────────────────────────────
  async createCampaign(
    companyId: string,
    userId: string,
    authHeader: string | undefined,
    data: { name: string; goal: string; channels?: string[]; brandId?: string },
  ): Promise<Campaign> {
    await this.assertMember(companyId, authHeader);
    const channels = data.channels?.length ? data.channels : ['email', 'social'];

    const prompt =
      'You are an AI marketing campaign engine. Produce a concise multi-channel campaign brief ' +
      '(creative concept, 2-3 copy angles per channel, an audience note, and a posting cadence). ' +
      `Goal: "${data.goal}". Channels: ${channels.join(', ')}.`;
    const ai = await this.callRouter(prompt, userId);

    const brief = ai
      ? ai.text
      : `Campaign brief for "${data.name}" (goal: ${data.goal}).\nChannels: ${channels.join(', ')}.\n` +
        '- Concept: one clear promise, repeated across channels.\n- Cadence: 3x/week for 3 weeks, review weekly.';

    return this.campaignRepo.save(
      this.campaignRepo.create({
        companyId,
        brandId: data.brandId,
        name: data.name,
        goal: data.goal,
        channels,
        status: 'draft',
        brief,
        aiGenerated: !!ai,
        createdBy: userId,
      }),
    );
  }

  async listCampaigns(companyId: string, userId: string, authHeader?: string): Promise<Campaign[]> {
    await this.assertMember(companyId, authHeader);
    return this.campaignRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async getCampaign(id: string, userId: string, authHeader?: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    await this.assertMember(campaign.companyId, authHeader);
    return campaign;
  }

  async updateCampaignStatus(id: string, userId: string, authHeader: string | undefined, status: CampaignStatus): Promise<Campaign> {
    const campaign = await this.getCampaign(id, userId, authHeader);
    campaign.status = status;
    return this.campaignRepo.save(campaign);
  }

  // ── GDPR ──────────────────────────────────────────────────────────
  // Brands and campaigns are company assets and are retained; we only remove the
  // personal linkage (createdBy) of the deleted user.
  async deleteUserData(userId: string): Promise<void> {
    this.logger.log(`GDPR cascade: anonymising brand/campaign authorship for user ${userId}`);
    await this.brandRepo.update({ createdBy: userId }, { createdBy: 'deleted-user' });
    await this.campaignRepo.update({ createdBy: userId }, { createdBy: 'deleted-user' });
  }
}
