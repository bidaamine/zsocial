import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AggregatorService {
  private readonly logger = new Logger(AggregatorService.name);

  constructor(private readonly httpService: HttpService) {}

  async getWebDashboardData(userId: string, authHeader: string) {
    this.logger.log(`Aggregating web dashboard data for user ${userId}`);
    
    try {
      const [profileRes, consentRes, authRes] = await Promise.all([
        lastValueFrom(this.httpService.get(`http://user-profile-service:4001/api/profile/${userId}`, { headers: { Authorization: authHeader } }).pipe()).catch(() => ({ data: { status: 'offline' } })),
        lastValueFrom(this.httpService.get(`http://consent-service:4106/api/consent/${userId}`, { headers: { Authorization: authHeader } }).pipe()).catch(() => ({ data: { status: 'offline' } })),
        lastValueFrom(this.httpService.get(`http://auth-service:4003/api/auth/status`, { headers: { Authorization: authHeader } }).pipe()).catch(() => ({ data: { status: 'offline' } }))
      ]);

      return {
        userId,
        surface: 'web',
        profile: profileRes.data,
        consent: consentRes.data,
        authStatus: authRes.data,
        aggregatedAt: new Date().toISOString()
      };
    } catch (e: any) {
      this.logger.error(`Aggregation failed: ${e.message}`);
      throw e;
    }
  }

  async getMobileAppData(userId: string, authHeader: string) {
    const data = await this.getWebDashboardData(userId, authHeader);
    return {
      ...data,
      surface: 'mobile',
      pushEnabled: true,
    };
  }
}
