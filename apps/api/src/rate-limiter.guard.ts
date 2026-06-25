import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@nexus/core-infra';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly limit = 100;
  private readonly windowMs = 60000;

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || '127.0.0.1';
    
    const key = `rate-limit:${ip}`;
    const current = await this.redisService.get(key);
    
    let count = current ? parseInt(current, 10) : 0;
    count++;
    
    if (count === 1) {
      await this.redisService.set(key, count.toString(), this.windowMs / 1000);
    } else {
      await this.redisService.getClient().incr(key);
    }

    if (count > this.limit) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    
    return true;
  }
}
