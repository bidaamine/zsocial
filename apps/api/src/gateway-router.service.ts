import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class GatewayRouterService {
  routeRequest(path: string) {
    if (path.startsWith('/auth')) return 'http://auth-service:4003';
    if (path.startsWith('/media')) return 'http://media-file-service:4107';
    if (path.startsWith('/notify')) return 'http://notification-service:4105';
    throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
  }
}
