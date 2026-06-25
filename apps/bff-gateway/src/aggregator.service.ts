import { Injectable } from '@nestjs/common';

@Injectable()
export class AggregatorService {
  async getWebDashboardData(userId: string) {
    return {
      userId,
      surface: 'web',
      feeds: ['news', 'family'],
      notifications: 5
    };
  }

  async getMobileAppData(userId: string) {
    return {
      userId,
      surface: 'mobile',
      feeds: ['news'],
      notifications: 2,
      pushEnabled: true
    };
  }
}
