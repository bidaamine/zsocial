import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { StorageProviderService } from './storage-provider.service';
import { MediaAccessGuard } from './media-access.guard';
import { MinioModule } from '@nexus/core-infra';

@Module({
  imports: [
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
