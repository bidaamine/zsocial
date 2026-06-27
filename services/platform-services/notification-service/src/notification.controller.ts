import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  @EventPattern('dispatch_notification')
  async handleNotification(
    @Payload() data: {
      userId: string;
      channel: 'email' | 'push' | 'sms';
      templateKey: string;
      recipient: string;
      variables?: Record<string, string>;
    },
  ) {
    return this.dispatcher.dispatch(
      data.userId,
      data.channel,
      data.templateKey || 'alert',
      data.recipient,
      data.variables || {},
    );
  }

  @Post('send')
  async triggerManualSend(
    @Body('userId') userId: string,
    @Body('channel') channel: 'email' | 'push' | 'sms',
    @Body('templateKey') templateKey: string,
    @Body('recipient') recipient: string,
    @Body('variables') variables: Record<string, string>,
  ) {
    return this.dispatcher.dispatch(userId, channel, templateKey, recipient, variables || {});
  }

  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    return this.dispatcher.getUserHistory(userId);
  }

  @Post('retry-failed')
  async retryFailed() {
    const successCount = await this.dispatcher.processFailedRetries();
    return { success: true, retriedSuccessfully: successCount };
  }
}
