import { Module } from '@nestjs/common';
import { StorageProviderService } from './storage-provider.service';
import { MediaController } from './media.controller';

@Module({
  imports: [],
  controllers: [MediaController],
  providers: [StorageProviderService],
})
export class AppModule {}
