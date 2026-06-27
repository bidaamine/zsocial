import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserProfile } from './entities/user-profile.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { ZeroTrustGuard } from './zero-trust.guard';
import { PostgresModule, KafkaModule } from '@nexus/core-infra';

@Module({
  imports: [
    PostgresModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'nexus',
      password: 'password',
      database: 'nexus_db',
      autoLoadEntities: true,
      synchronize: true, // Dev-only
    }),
    TypeOrmModule.forFeature([UserProfile, UserPreferences]),
    KafkaModule.registerClient('PROFILE_CLIENT', ['localhost:9092'], 'profile-service')
  ],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    ZeroTrustGuard,
  ],
})
export class AppModule {}
