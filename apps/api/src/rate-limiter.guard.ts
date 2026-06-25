import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private requests = new Map<string, number>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || '127.0.0.1';
    
    const count = this.requests.get(ip) || 0;
    if (count > 100) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.requests.set(ip, count + 1);
    
    return true;
  }
}
