import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandingController, BrandingResourceController } from './branding.controller';
import { BrandingService } from './branding.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { Brand } from './entities/brand.entity';
import { Campaign } from './entities/campaign.entity';
import { PostgresModule } from '@nexus/core-infra';

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
    TypeOrmModule.forFeature([Brand, Campaign]),
  ],
  controllers: [BrandingController, BrandingResourceController],
  providers: [BrandingService, ZeroTrustGuard],
})
export class AppModule {}
