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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDispatcherService = void 0;
const common_1 = require("@nestjs/common");
const email_provider_1 = require("./providers/email.provider");
const push_provider_1 = require("./providers/push.provider");
let NotificationDispatcherService = class NotificationDispatcherService {
    emailProvider;
    pushProvider;
    constructor(emailProvider, pushProvider) {
        this.emailProvider = emailProvider;
        this.pushProvider = pushProvider;
    }
    async dispatch(userId, channel, payload) {
        if (channel === 'email') {
            return this.emailProvider.send(payload.to, payload.title, payload.body);
        }
        else {
            return this.pushProvider.send(payload.deviceId, payload.title, payload.body);
        }
    }
};
exports.NotificationDispatcherService = NotificationDispatcherService;
exports.NotificationDispatcherService = NotificationDispatcherService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_provider_1.EmailProvider,
        push_provider_1.PushProvider])
], NotificationDispatcherService);
