import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { Notification } from './entities/notification.entity';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;
  let mockRepository: any;
  let mockEmailProvider: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const id = record.id || 'notif-uuid';
        return Promise.resolve({ id, ...record, createdAt: new Date() });
      }),
      find: jest.fn().mockResolvedValue([]),
    };

    mockEmailProvider = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockPushProvider = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockSmsProvider = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        { provide: getRepositoryToken(Notification), useValue: mockRepository },
        { provide: EmailProvider, useValue: mockEmailProvider },
        { provide: PushProvider, useValue: mockPushProvider },
        { provide: SmsProvider, useValue: mockSmsProvider },
      ],
    }).compile();

    service = module.get<NotificationDispatcherService>(NotificationDispatcherService);
  });

  it('should interpolate welcome template and save to database with status sent', async () => {
    const res = await service.dispatch('u123', 'email', 'welcome', 'user@test.com', { username: 'Mohamed' });
    
    expect(res.userId).toBe('u123');
    expect(res.channel).toBe('email');
    expect(res.recipient).toBe('user@test.com');
    expect(res.title).toBe('Welcome to NEXUS!');
    expect(res.body).toContain('Hello Mohamed');
    expect(res.status).toBe('sent');
  });

  it('should queue and retry notifications if provider fails initially', async () => {
    // Simulate email provider throwing an exception
    mockEmailProvider.send.mockRejectedValueOnce(new Error('SMTP timeout'));

    const res = await service.dispatch('u123', 'email', 'mfa_code', 'user@test.com', { code: '123456' });

    expect(res.status).toBe('queued');
    expect(res.retryCount).toBe(1);
    expect(res.errorMessage).toBe('SMTP timeout');
  });
});
