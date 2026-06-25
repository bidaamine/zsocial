import { Module, DynamicModule, Global } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({})
export class RedisModule {
  static forRoot(options: RedisOptions): DynamicModule {
    const redisProvider = {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis(options);
      },
    };

    return {
      module: RedisModule,
      providers: [redisProvider, RedisService],
      exports: [RedisService, 'REDIS_CLIENT'],
    };
  }
}
