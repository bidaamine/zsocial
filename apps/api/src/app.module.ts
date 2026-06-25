import { Module } from '@nestjs/common';
import { GatewayRouterService } from './gateway-router.service';
import { RateLimiterGuard } from './rate-limiter.guard';
import { GatewayController } from './gateway.controller';

@Module({
  imports: [],
  controllers: [GatewayController],
  providers: [GatewayRouterService, RateLimiterGuard],
})
export class AppModule {}
