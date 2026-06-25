"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const notification_dispatcher_service_1 = require("./notification-dispatcher.service");
const email_provider_1 = require("./providers/email.provider");
const push_provider_1 = require("./providers/push.provider");
describe('NotificationDispatcherService', () => {
    let service;
    beforeEach(async () => {
        const mod = await testing_1.Test.createTestingModule({
            providers: [notification_dispatcher_service_1.NotificationDispatcherService, email_provider_1.EmailProvider, push_provider_1.PushProvider]
        }).compile();
        service = mod.get(notification_dispatcher_service_1.NotificationDispatcherService);
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
