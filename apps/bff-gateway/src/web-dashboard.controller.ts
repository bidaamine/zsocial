import { Controller, Get, Query } from '@nestjs/common';
import { AggregatorService } from './aggregator.service';

@Controller('web')
export class WebDashboardController {
  constructor(private aggregator: AggregatorService) {}

  @Get('dashboard')
  async getDashboard(@Query('userId') userId: string) {
    return this.aggregator.getWebDashboardData(userId || 'anonymous');
  }
}
