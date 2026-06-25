import { Test } from '@nestjs/testing';
import { GatewayRouterService } from './gateway-router.service';
import { HttpException } from '@nestjs/common';

describe('GatewayRouterService', () => {
  let service: GatewayRouterService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [GatewayRouterService]
    }).compile();
    service = mod.get(GatewayRouterService);
  });

  it('should route auth', () => {
    expect(service.routeRequest('/auth')).toBe('http://auth-service:4003');
  });

  it('should throw on unknown', () => {
    expect(() => service.routeRequest('/unknown')).toThrow(HttpException);
  });
});
