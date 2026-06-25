import { Controller, Get, Query } from '@nestjs/common';
import { AggregatorService } from './aggregator.service';

@Controller('mobile')
export class MobileAppController {
  constructor(private aggregator: AggregatorService) {}

  @Get('home')
  async getHome(@Query('userId') userId: string) {
    return this.aggregator.getMobileAppData(userId || 'anonymous');
  }
}
