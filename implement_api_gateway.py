import os

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"
api_dir = os.path.join(base_dir, "apps", "api", "src")

# 1. API Gateway Implementation
with open(os.path.join(api_dir, "gateway-router.service.ts"), "w") as f:
    f.write("""import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class GatewayRouterService {
  routeRequest(path: string) {
    if (path.startsWith('/auth')) return 'http://auth-service:4003';
    if (path.startsWith('/media')) return 'http://media-file-service:4107';
    if (path.startsWith('/notify')) return 'http://notification-service:4105';
    throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
  }
}
""")

with open(os.path.join(api_dir, "rate-limiter.guard.ts"), "w") as f:
    f.write("""import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private requests = new Map<string, number>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || '127.0.0.1';
    
    const count = this.requests.get(ip) || 0;
    if (count > 100) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.requests.set(ip, count + 1);
    
    return true;
  }
}
""")

with open(os.path.join(api_dir, "gateway.controller.ts"), "w") as f:
    f.write("""import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { GatewayRouterService } from './gateway-router.service';
import { RateLimiterGuard } from './rate-limiter.guard';

@Controller('api')
@UseGuards(RateLimiterGuard)
export class GatewayController {
  constructor(private router: GatewayRouterService) {}

  @Get('health')
  healthCheck() {
    return { status: 'Gateway is healthy', layer: 'Edge' };
  }

  @Get('route/:serviceName')
  getRouteTarget(@Param('serviceName') serviceName: string) {
    return { target: this.router.routeRequest(`/${serviceName}`) };
  }
}
""")

with open(os.path.join(api_dir, "app.module.ts"), "w") as f:
    f.write("""import { Module } from '@nestjs/common';
import { GatewayRouterService } from './gateway-router.service';
import { RateLimiterGuard } from './rate-limiter.guard';
import { GatewayController } from './gateway.controller';

@Module({
  imports: [],
  controllers: [GatewayController],
  providers: [GatewayRouterService, RateLimiterGuard],
})
export class AppModule {}
""")

with open(os.path.join(api_dir, "gateway-router.service.spec.ts"), "w") as f:
    f.write("""import { Test } from '@nestjs/testing';
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
""")

with open(os.path.join(api_dir, "rate-limiter.guard.spec.ts"), "w") as f:
    f.write("""import { RateLimiterGuard } from './rate-limiter.guard';
import { ExecutionContext, HttpException } from '@nestjs/common';

describe('RateLimiterGuard', () => {
  let guard: RateLimiterGuard;

  beforeEach(() => {
    guard = new RateLimiterGuard();
  });

  it('should allow under limit', () => {
    const mockContext = { switchToHttp: () => ({ getRequest: () => ({ ip: '1.1.1.1' }) }) } as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should block over limit', () => {
    const mockContext = { switchToHttp: () => ({ getRequest: () => ({ ip: '1.1.1.1' }) }) } as ExecutionContext;
    for (let i = 0; i < 101; i++) {
      guard.canActivate(mockContext);
    }
    expect(() => guard.canActivate(mockContext)).toThrow(HttpException);
  });
});
""")

print("Successfully wrote full implementation for API Gateway!")
