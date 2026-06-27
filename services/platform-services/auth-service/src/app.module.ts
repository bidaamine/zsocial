import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PostgresModule, RedisModule } from '@nexus/core-infra';
import { AppController } from './app.controller';
import { AuthKafkaController } from './kafka/auth-kafka.controller';
import { User } from './entities/user.entity';
import { MfaConfig } from './entities/mfa-config.entity';
import { Passkey } from './entities/passkey.entity';
import { OAuthProfile } from './entities/oauth-profile.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserDevice } from './entities/user-device.entity';
import { KeysModule } from './keys/keys.module';
import { MfaModule } from './mfa/mfa.module';
import { PasskeyModule } from './passkey/passkey.module';
import { OAuthModule } from './oauth/oauth.module';
import { AuthCoreModule } from './auth-core.module';

@Module({
  imports: [
    KeysModule,
    AuthCoreModule,
    MfaModule,
    PasskeyModule,
    OAuthModule,
    PostgresModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5434', 10),
      username: process.env.POSTGRES_USER || 'nexus',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DB || 'nexus_db',
      autoLoadEntities: true,
      synchronize: true, // Only for development/MVP!
    }),
    TypeOrmModule.forFeature([User, MfaConfig, Passkey, OAuthProfile, RefreshToken, UserDevice]),
    JwtModule.register({
      global: true,
    }),
    RedisModule.forRoot({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
  controllers: [AppController, AuthKafkaController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
