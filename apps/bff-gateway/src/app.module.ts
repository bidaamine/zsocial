import { Module } from '@nestjs/common';
import { WebDashboardController } from './web-dashboard.controller';
import { MobileAppController } from './mobile-app.controller';
import { AggregatorService } from './aggregator.service';

@Module({
  imports: [],
  controllers: [WebDashboardController, MobileAppController],
  providers: [AggregatorService],
})
export class AppModule {}
