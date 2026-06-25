import { Module } from '@nestjs/common';
import { LiveUpdatesGateway } from './live-updates.gateway';
import { StreamManagerService } from './stream-manager.service';

@Module({
  imports: [],
  providers: [LiveUpdatesGateway, StreamManagerService],
})
export class AppModule {}
