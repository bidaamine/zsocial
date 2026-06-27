import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebDashboardController } from './web-dashboard.controller';
import { MobileAppController } from './mobile-app.controller';
import { AggregatorService } from './aggregator.service';
import { RedisModule } from '@nexus/core-infra';

@Module({
  imports: [
    RedisModule.forRoot({ host: 'localhost', port: 6379 }),
    HttpModule
  ],
  controllers: [WebDashboardController, MobileAppController],
  providers: [AggregatorService],
})
export class AppModule {}
