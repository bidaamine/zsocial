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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const notification_dispatcher_service_1 = require("./notification-dispatcher.service");
let NotificationController = class NotificationController {
    dispatcher;
    constructor(dispatcher) {
        this.dispatcher = dispatcher;
    }
    async handleNotification(data) {
        return this.dispatcher.dispatch(data.userId, data.channel, data.templateKey || 'alert', data.recipient, data.variables || {});
    }
    async triggerManualSend(userId, channel, templateKey, recipient, variables) {
        return this.dispatcher.dispatch(userId, channel, templateKey, recipient, variables || {});
    }
    async getHistory(userId) {
        return this.dispatcher.getUserHistory(userId);
    }
    async retryFailed() {
        const successCount = await this.dispatcher.processFailedRetries();
        return { success: true, retriedSuccessfully: successCount };
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, microservices_1.EventPattern)('dispatch_notification'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "handleNotification", null);
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, common_1.Body)('userId')),
    __param(1, (0, common_1.Body)('channel')),
    __param(2, (0, common_1.Body)('templateKey')),
    __param(3, (0, common_1.Body)('recipient')),
    __param(4, (0, common_1.Body)('variables')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "triggerManualSend", null);
__decorate([
    (0, common_1.Get)('history/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('retry-failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "retryFailed", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notification_dispatcher_service_1.NotificationDispatcherService])
], NotificationController);
