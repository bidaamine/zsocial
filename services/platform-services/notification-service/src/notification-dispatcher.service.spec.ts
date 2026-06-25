import { Test } from '@nestjs/testing';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [NotificationDispatcherService, EmailProvider, PushProvider]
    }).compile();
    service = mod.get(NotificationDispatcherService);
  });

  it('should dispatch email', async () => {
    const res = await service.dispatch('u1', 'email', { to: 'a@a.com', title: 'hi' });
    expect(res.method).toBe('email');
  });

  it('should dispatch push', async () => {
    const res = await service.dispatch('u1', 'push', { deviceId: '123', title: 'hi' });
    expect(res.method).toBe('push');
  });
});
