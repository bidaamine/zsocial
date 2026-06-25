import { Test } from '@nestjs/testing';
import { AggregatorService } from './aggregator.service';

describe('AggregatorService', () => {
  let service: AggregatorService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [AggregatorService]
    }).compile();
    service = mod.get(AggregatorService);
  });

  it('should return web dashboard payload', async () => {
    const data = await service.getWebDashboardData('u1');
    expect(data.surface).toBe('web');
  });

  it('should return mobile payload', async () => {
    const data = await service.getMobileAppData('u1');
    expect(data.surface).toBe('mobile');
  });
});
