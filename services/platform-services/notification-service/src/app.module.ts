import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { KafkaModule } from '@nexus/core-infra';

@Module({
  imports: [
    KafkaModule.registerClient('NOTIFICATION_CLIENT', ['localhost:9092'], 'notification-service')
  ],
  controllers: [NotificationController],
  providers: [
    NotificationDispatcherService,
    EmailProvider,
    PushProvider,
  ],
})
export class AppModule {}
