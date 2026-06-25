import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Controller('notify')
export class NotificationController {
  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  @EventPattern('dispatch_notification')
  async handleNotification(@Payload() data: { userId: string, channel: 'email' | 'push', payload: any }) {
    return this.dispatcher.dispatch(data.userId, data.channel, data.payload);
  }
}
