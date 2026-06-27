"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const notification_dispatcher_service_1 = require("./notification-dispatcher.service");
const notification_entity_1 = require("./entities/notification.entity");
const email_provider_1 = require("./providers/email.provider");
const push_provider_1 = require("./providers/push.provider");
const sms_provider_1 = require("./providers/sms.provider");
describe('NotificationDispatcherService', () => {
    let service;
    let mockRepository;
    let mockEmailProvider;
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                notification_dispatcher_service_1.NotificationDispatcherService,
                { provide: (0, typeorm_1.getRepositoryToken)(notification_entity_1.Notification), useValue: mockRepository },
                { provide: email_provider_1.EmailProvider, useValue: mockEmailProvider },
                { provide: push_provider_1.PushProvider, useValue: mockPushProvider },
                { provide: sms_provider_1.SmsProvider, useValue: mockSmsProvider },
            ],
        }).compile();
        service = module.get(notification_dispatcher_service_1.NotificationDispatcherService);
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
