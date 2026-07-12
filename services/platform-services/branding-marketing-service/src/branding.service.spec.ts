import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BrandingService } from './branding.service';
import { Brand } from './entities/brand.entity';
import { Campaign } from './entities/campaign.entity';

describe('BrandingService', () => {
  let service: BrandingService;
  let brandDb: any[];
  let campaignDb: any[];
  let membershipOk: boolean;
  let routerUp: boolean;

  beforeEach(async () => {
    brandDb = [];
    campaignDb = [];
    membershipOk = true;
    routerUp = false;

    // Route fetch by URL: company-service membership check vs ai-model-router.
    global.fetch = jest.fn(async (url: any) => {
      const u = String(url);
      if (u.includes('/api/companies/')) return { ok: membershipOk } as any;
      if (u.includes('/route')) {
        if (routerUp) {
          return { ok: true, json: async () => ({ response_text: 'AI BRAND/CAMPAIGN OUTPUT', routed_model: 'claude-3-5-sonnet' }) } as any;
        }
        throw new Error('router down');
      }
      return { ok: false } as any;
    }) as any;

    const brandRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (b: any) => { b.id = b.id || `br-${brandDb.length}`; brandDb.push(b); return Promise.resolve(b); },
      find: ({ where: { companyId } }: any) => Promise.resolve(brandDb.filter((b) => b.companyId === companyId)),
      findOne: ({ where: { id } }: any) => Promise.resolve(brandDb.find((b) => b.id === id) || null),
      update: () => Promise.resolve({ affected: 1 }),
    };
    const campaignRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (c: any) => { c.id = c.id || `ca-${campaignDb.length}`; campaignDb.push(c); return Promise.resolve(c); },
      find: ({ where: { companyId } }: any) => Promise.resolve(campaignDb.filter((c) => c.companyId === companyId)),
      findOne: ({ where: { id } }: any) => Promise.resolve(campaignDb.find((c) => c.id === id) || null),
      update: () => Promise.resolve({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandingService,
        { provide: getRepositoryToken(Brand), useValue: brandRepo },
        { provide: getRepositoryToken(Campaign), useValue: campaignRepo },
      ],
    }).compile();

    service = module.get<BrandingService>(BrandingService);
  });

  it('creates a brand for a verified company member', async () => {
    const b = await service.createBrand('co1', 'u1', 'Bearer x', { name: 'Acme', tagline: 'We build' });
    expect(b.name).toBe('Acme');
    expect(b.createdBy).toBe('u1');
  });

  it('blocks brand creation for non-members (fail-closed)', async () => {
    membershipOk = false;
    await expect(service.createBrand('co1', 'stranger', 'Bearer x', { name: 'Acme' })).rejects.toThrow();
  });

  it('generates brand suggestions via the router when available', async () => {
    routerUp = true;
    const res = await service.generateBrandSuggestions('co1', 'u1', 'Bearer x', { name: 'Acme', positioning: 'premium' });
    expect(res.generatedBy).toBe('claude-3-5-sonnet');
    expect(res.suggestion).toBe('AI BRAND/CAMPAIGN OUTPUT');
  });

  it('falls back to a template when the router is down', async () => {
    routerUp = false;
    const res = await service.generateBrandSuggestions('co1', 'u1', 'Bearer x', { name: 'Acme' });
    expect(res.generatedBy).toBe('template');
    expect(res.suggestion).toContain('Acme');
  });

  it('creates a campaign with an AI brief when the router is up', async () => {
    routerUp = true;
    const c = await service.createCampaign('co1', 'u1', 'Bearer x', { name: 'Launch', goal: 'Grow signups' });
    expect(c.aiGenerated).toBe(true);
    expect(c.brief).toBe('AI BRAND/CAMPAIGN OUTPUT');
    expect(c.channels).toEqual(['email', 'social']); // default channels
    expect(c.status).toBe('draft');
  });

  it('creates a campaign with a template brief when the router is down', async () => {
    routerUp = false;
    const c = await service.createCampaign('co1', 'u1', 'Bearer x', { name: 'Launch', goal: 'Grow signups', channels: ['search'] });
    expect(c.aiGenerated).toBe(false);
    expect(c.brief).toContain('Launch');
    expect(c.channels).toEqual(['search']);
  });
});
