import { Module } from '@nestjs/common';
import { ThreatDetectionService } from './threat-detection.service';

@Module({
  imports: [],
  controllers: [],
  providers: [ThreatDetectionService],
})
export class AppModule {}
