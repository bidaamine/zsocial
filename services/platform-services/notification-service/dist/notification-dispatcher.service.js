"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationDispatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDispatcherService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const email_provider_1 = require("./providers/email.provider");
const push_provider_1 = require("./providers/push.provider");
const sms_provider_1 = require("./providers/sms.provider");
let NotificationDispatcherService = NotificationDispatcherService_1 = class NotificationDispatcherService {
    notificationRepo;
    emailProvider;
    pushProvider;
    smsProvider;
    logger = new common_1.Logger(NotificationDispatcherService_1.name);
    // Simple template store for dynamic message composition
    templates = {
        welcome: {
            title: 'Welcome to NEXUS!',
            body: 'Hello {{username}}, welcome to NEXUS. Your intelligent life assistant is ready.',
        },
        mfa_code: {
            title: 'NEXUS Security Code',
            body: 'Your multi-factor security code is: {{code}}. This code expires in 5 minutes.',
        },
        child_safety_alert: {
            title: '⚠️ Parental Safeguarding Alert',
            body: 'Attention: Grooming or cyberbullying pattern indicators were flagged: {{reason}}',
        },
        gdpr_deletion_completed: {
            title: 'GDPR Right to Be Forgotten Complete',
            body: 'Your user profile data and connections have been permanently erased from all NEXUS storage caches.',
        },
    };
    constructor(notificationRepo, emailProvider, pushProvider, smsProvider) {
        this.notificationRepo = notificationRepo;
        this.emailProvider = emailProvider;
        this.pushProvider = pushProvider;
        this.smsProvider = smsProvider;
    }
    async dispatch(userId, channel, templateKey, recipient, variables = {}) {
        this.logger.log(`Dispatch requested for user ${userId} via ${channel}`);
        // Retrieve and interpolate template
        const template = this.templates[templateKey] || {
            title: 'NEXUS Alert',
            body: `Notification alert: ${JSON.stringify(variables)}`,
        };
        let title = template.title;
        let body = template.body;
        // Perform interpolation
        for (const [key, value] of Object.entries(variables)) {
            body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
            title = title.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        // Create persistent record
        const notification = this.notificationRepo.create({
            userId,
            channel,
            recipient,
            title,
            body,
            status: 'queued',
            retryCount: 0,
        });
        const savedRecord = await this.notificationRepo.save(notification);
        return this.sendNotificationRecord(savedRecord);
    }
    async sendNotificationRecord(record) {
        try {
            let result;
            if (record.channel === 'email') {
                result = await this.emailProvider.send(record.recipient, record.title, record.body);
            }
            else if (record.channel === 'push') {
                result = await this.pushProvider.send(record.recipient, record.title, record.body);
            }
            else {
                result = await this.smsProvider.send(record.recipient, record.body);
            }
            if (result && result.success) {
                record.status = 'sent';
                record.sentAt = new Date();
                record.errorMessage = undefined;
            }
            else {
                throw new Error('Provider failed to accept dispatch request');
            }
        }
        catch (error) {
            this.logger.error(`Failed to dispatch notification ID ${record.id}: ${error.message}`);
            record.retryCount += 1;
            record.errorMessage = error.message;
            if (record.retryCount >= 3) {
                record.status = 'failed';
            }
            else {
                record.status = 'queued'; // available for background retry
            }
        }
        return this.notificationRepo.save(record);
    }
    // Background processor / cron fallback for failed items
    async processFailedRetries() {
        const pending = await this.notificationRepo.find({
            where: { status: 'queued' },
        });
        this.logger.log(`Scanning retry queues. Found ${pending.length} notifications to process.`);
        let successes = 0;
        for (const notification of pending) {
            const updated = await this.sendNotificationRecord(notification);
            if (updated.status === 'sent') {
                successes++;
            }
        }
        return successes;
    }
    async getUserHistory(userId) {
        return this.notificationRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
};
exports.NotificationDispatcherService = NotificationDispatcherService;
exports.NotificationDispatcherService = NotificationDispatcherService = NotificationDispatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        email_provider_1.EmailProvider,
        push_provider_1.PushProvider,
        sms_provider_1.SmsProvider])
], NotificationDispatcherService);
