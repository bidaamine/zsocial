import { Test, TestingModule } from '@nestjs/testing';
import { AggregatorService } from './aggregator.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('AggregatorService', () => {
  let service: AggregatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AggregatorService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(() => of({ data: { mock: 'data' } })),
          },
        },
      ],
    }).compile();

    service = module.get<AggregatorService>(AggregatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return web dashboard payload', async () => {
    const result = await service.getWebDashboardData('123', 'Bearer fake');
    expect(result.userId).toBe('123');
    expect(result.surface).toBe('web');
  });

  it('should get mobile app data', async () => {
    const result = await service.getMobileAppData('123', 'Bearer fake');
    expect(result.userId).toBe('123');
    expect(result.surface).toBe('mobile');
  });
});
