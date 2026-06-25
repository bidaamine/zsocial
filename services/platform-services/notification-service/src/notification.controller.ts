import { Controller, Post, Body } from '@nestjs/common';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Controller('notify')
export class NotificationController {
  constructor(private dispatcher: NotificationDispatcherService) {}

  @Post()
  async sendNotification(@Body() body: any) {
    return this.dispatcher.dispatch(body.userId, body.channel, body.payload);
  }
}
