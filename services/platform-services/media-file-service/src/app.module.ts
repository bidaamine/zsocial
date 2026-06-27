import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaController } from './media.controller';
import { StorageProviderService } from './storage-provider.service';
import { MediaAccessGuard } from './media-access.guard';
import { MediaRecord } from './entities/media-record.entity';
import { MinioModule, PostgresModule } from '@nexus/core-infra';

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
    TypeOrmModule.forFeature([MediaRecord]),
    MinioModule.forRoot({
      config: {
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'nexus',
          secretAccessKey: 'password123',
        },
        forcePathStyle: true,
      },
      bucket: 'nexus-media'
    })
  ],
  controllers: [MediaController],
  providers: [
    StorageProviderService,
    MediaAccessGuard,
  ],
})
export class AppModule {}
