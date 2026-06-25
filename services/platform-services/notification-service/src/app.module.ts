import { Module } from '@nestjs/common';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationController } from './notification.controller';

@Module({
  imports: [],
  controllers: [NotificationController],
  providers: [EmailProvider, PushProvider, NotificationDispatcherService],
})
export class AppModule {}
