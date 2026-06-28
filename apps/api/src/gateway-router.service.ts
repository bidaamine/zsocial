import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class GatewayRouterService {
  private readonly logger = new Logger(GatewayRouterService.name);

  constructor(private httpService: HttpService) {}

  private getTargetUrl(serviceName: string): string | undefined {
    const registry: Record<string, string> = {
      'auth': process.env.AUTH_SERVICE_URL || 'http://localhost:4100',
      'media': process.env.MEDIA_SERVICE_URL || 'http://localhost:4107',
      'notify': process.env.NOTIFY_SERVICE_URL || 'http://localhost:4105',
      'profile': process.env.PROFILE_SERVICE_URL || 'http://localhost:4001',
      'family': process.env.FAMILY_SERVICE_URL || 'http://localhost:4002',
      'content': process.env.CONTENT_SERVICE_URL || 'http://localhost:4112',
      'messaging': process.env.MESSAGING_SERVICE_URL || 'http://localhost:4113',
    };
    return registry[serviceName];
  }

  async proxy(serviceName: string, req: any) {
    const targetBase = this.getTargetUrl(serviceName);
    if (!targetBase) {
      throw new HttpException('Service not found in Zero-Trust registry', HttpStatus.NOT_FOUND);
    }

    const targetPath = req.url.replace(`/api/route/${serviceName}`, '');
    const url = `${targetBase}${targetPath}`;
    
    this.logger.log(`Proxying request to ${url} for user ${req.user?.sub}`);

    try {
      const response = await lastValueFrom(
        this.httpService.request({
          method: req.method,
          url,
          data: req.body,
          headers: {
            ...req.headers,
            host: undefined, // remove original host
            'x-nexus-user-id': req.user?.sub,
            'x-nexus-user-role': req.user?.role,
          },
        })
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(`Proxy error to ${url}: ${err.message}`);
      throw new HttpException(
        err.response?.data || 'Downstream service error',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
