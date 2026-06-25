import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial\packages\core-infra"

os.makedirs(os.path.join(base_dir, "src", "redis"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "src", "kafka"), exist_ok=True)

# package.json
pkg = {
  "name": "@nexus/core-infra",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "ioredis": "^5.4.1",
    "kafkajs": "^2.2.4",
    "@nestjs/microservices": "^11.1.27"
  },
  "devDependencies": {
    "@nestjs/common": "^11.1.27",
    "@nestjs/core": "^11.1.27",
    "@nexus/tsconfig": "workspace:*",
    "typescript": "^5.7.3"
  },
  "peerDependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0"
  }
}

with open(os.path.join(base_dir, "package.json"), "w") as f:
    json.dump(pkg, f, indent=2)

# tsconfig.json
tsconfig = {
  "extends": "@nexus/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": True,
    "experimentalDecorators": True,
    "emitDecoratorMetadata": True
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

with open(os.path.join(base_dir, "tsconfig.json"), "w") as f:
    json.dump(tsconfig, f, indent=2)

# src/redis/redis.service.ts
redis_svc = """import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  getClient(): Redis {
    return this.redisClient;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.set(key, value, 'EX', ttl);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }
}
"""

with open(os.path.join(base_dir, "src", "redis", "redis.service.ts"), "w") as f:
    f.write(redis_svc)

# src/redis/redis.module.ts
redis_mod = """import { Module, DynamicModule, Global } from '@nestjs/common';
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
"""

with open(os.path.join(base_dir, "src", "redis", "redis.module.ts"), "w") as f:
    f.write(redis_mod)

# src/kafka/kafka.module.ts
kafka_mod = """import { Module, DynamicModule, Global } from '@nestjs/common';
import { ClientsModule, Transport, KafkaOptions } from '@nestjs/microservices';

@Global()
@Module({})
export class KafkaModule {
  /**
   * Initialize a Kafka Client.
   * @param name The injection token name for the Kafka Client
   * @param brokers Array of broker URLs, e.g. ['localhost:9092']
   * @param clientId The Kafka client ID
   */
  static registerClient(name: string, brokers: string[], clientId: string): DynamicModule {
    return {
      module: KafkaModule,
      imports: [
        ClientsModule.register([
          {
            name,
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId,
                brokers,
              },
              consumer: {
                groupId: `${clientId}-group`,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
"""

with open(os.path.join(base_dir, "src", "kafka", "kafka.module.ts"), "w") as f:
    f.write(kafka_mod)

# src/index.ts
index = """export * from './redis/redis.module';
export * from './redis/redis.service';
export * from './kafka/kafka.module';
"""

with open(os.path.join(base_dir, "src", "index.ts"), "w") as f:
    f.write(index)

print("Created @nexus/core-infra successfully.")
