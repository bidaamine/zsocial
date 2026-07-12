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
      category?: 'ai_action' | 'alert' | 'insight' | 'info';
      priority?: 'critical' | 'high' | 'normal' | 'low';
    },
  ) {
    return this.dispatcher.dispatch(
      data.userId,
      data.channel,
      data.templateKey || 'alert',
      data.recipient,
      data.variables || {},
      { category: data.category, priority: data.priority },
    );
  }

  @Post('send')
  async triggerManualSend(
    @Body('userId') userId: string,
    @Body('channel') channel: 'email' | 'push' | 'sms',
    @Body('templateKey') templateKey: string,
    @Body('recipient') recipient: string,
    @Body('variables') variables: Record<string, string>,
    @Body('category') category?: 'ai_action' | 'alert' | 'insight' | 'info',
    @Body('priority') priority?: 'critical' | 'high' | 'normal' | 'low',
  ) {
    return this.dispatcher.dispatch(userId, channel, templateKey, recipient, variables || {}, { category, priority });
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

  // ── Notification Intelligence ─────────────────────────────────────
  @Post('focus-mode')
  async setFocusMode(@Body('userId') userId: string, @Body('enabled') enabled: boolean) {
    const pref = await this.dispatcher.setFocusMode(userId, !!enabled);
    return { userId: pref.userId, focusMode: pref.focusMode };
  }

  @Post('focus-mode/:userId/release')
  async releaseHeld(@Param('userId') userId: string) {
    const delivered = await this.dispatcher.releaseHeld(userId);
    return { success: true, delivered };
  }

  @Get('health-score/:userId')
  async healthScore(@Param('userId') userId: string) {
    return this.dispatcher.getHealthScore(userId);
  }
}
