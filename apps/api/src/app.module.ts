import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayRouterService } from './gateway-router.service';
import { APP_GUARD } from '@nestjs/core';
import { RateLimiterGuard } from './rate-limiter.guard';
import { RedisModule } from '@nexus/core-infra';

@Module({
  imports: [
    RedisModule.forRoot({ host: 'localhost', port: 6379 })
  ],
  controllers: [GatewayController],
  providers: [
    GatewayRouterService,
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
})
export class AppModule {}
