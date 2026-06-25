import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
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
