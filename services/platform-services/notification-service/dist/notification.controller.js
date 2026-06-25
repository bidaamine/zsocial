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
        return this.dispatcher.dispatch(data.userId, data.channel, data.payload);
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
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)('notify'),
    __metadata("design:paramtypes", [notification_dispatcher_service_1.NotificationDispatcherService])
], NotificationController);
