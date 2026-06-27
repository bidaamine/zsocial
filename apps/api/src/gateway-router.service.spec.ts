import { Test, TestingModule } from '@nestjs/testing';
import { GatewayRouterService } from './gateway-router.service';
import { HttpService } from '@nestjs/axios';
import { HttpException } from '@nestjs/common';
import { of } from 'rxjs';

describe('GatewayRouterService', () => {
  let service: GatewayRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayRouterService,
        {
          provide: HttpService,
          useValue: {
            request: jest.fn(() => of({ data: 'mockData' })),
          },
        },
      ],
    }).compile();

    service = module.get<GatewayRouterService>(GatewayRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should proxy request successfully', async () => {
    const req = { url: '/api/route/auth/login', method: 'POST', body: {}, headers: {} };
    const res = await service.proxy('auth', req);
    expect(res).toBe('mockData');
  });

  it('should throw error for unknown service', async () => {
    const req = { url: '/api/route/unknown/test', method: 'GET', body: {}, headers: {} };
    await expect(service.proxy('unknown', req)).rejects.toThrow(HttpException);
  });
});
