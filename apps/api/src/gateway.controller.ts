import { Controller, Get, Param, UseGuards, Req, All } from '@nestjs/common';
import { GatewayRouterService } from './gateway-router.service';
import { RateLimiterGuard } from './rate-limiter.guard';
import { ZeroTrustGuard } from './zero-trust.guard';

@Controller('api')
@UseGuards(RateLimiterGuard)
export class GatewayController {
  constructor(private router: GatewayRouterService) {}

  @Get('health')
  healthCheck() {
    return { status: 'Gateway is healthy', layer: 'Edge', zeroTrust: 'active' };
  }

  @UseGuards(ZeroTrustGuard)
  @All('route/:serviceName/*')
  async proxyRequest(@Param('serviceName') serviceName: string, @Req() req: any) {
    return this.router.proxy(serviceName, req);
  }
}
