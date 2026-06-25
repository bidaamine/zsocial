import { Injectable } from '@nestjs/common';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';

@Injectable()
export class NotificationDispatcherService {
  constructor(
    private emailProvider: EmailProvider,
    private pushProvider: PushProvider
  ) {}

  async dispatch(userId: string, channel: 'email' | 'push', payload: any) {
    if (channel === 'email') {
      return this.emailProvider.send(payload.to, payload.title, payload.body);
    } else {
      return this.pushProvider.send(payload.deviceId, payload.title, payload.body);
    }
  }
}
