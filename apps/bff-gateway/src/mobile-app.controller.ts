import { Controller, Get, Param, Headers } from '@nestjs/common';
import { AggregatorService } from './aggregator.service';

@Controller('mobile')
export class MobileAppController {
  constructor(private aggregator: AggregatorService) {}

  @Get('dashboard/:userId')
  async getDashboard(
    @Param('userId') userId: string,
    @Headers('authorization') authHeader: string
  ) {
    return this.aggregator.getMobileAppData(userId, authHeader);
  }
}
