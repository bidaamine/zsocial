"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const notification_controller_1 = require("./notification.controller");
const notification_dispatcher_service_1 = require("./notification-dispatcher.service");
const email_provider_1 = require("./providers/email.provider");
const push_provider_1 = require("./providers/push.provider");
const core_infra_1 = require("@nexus/core-infra");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            core_infra_1.KafkaModule.registerClient('NOTIFICATION_CLIENT', ['localhost:9092'], 'notification-service')
        ],
        controllers: [notification_controller_1.NotificationController],
        providers: [
            notification_dispatcher_service_1.NotificationDispatcherService,
            email_provider_1.EmailProvider,
            push_provider_1.PushProvider,
        ],
    })
], AppModule);
