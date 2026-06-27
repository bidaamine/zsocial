"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PushProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushProvider = void 0;
const common_1 = require("@nestjs/common");
let PushProvider = PushProvider_1 = class PushProvider {
    logger = new common_1.Logger(PushProvider_1.name);
    async send(deviceId, title, body) {
        this.logger.log(`[PUSH-PROVIDER] Sending push notification to device ${deviceId} | Title: ${title} | Body: ${body}`);
        // Simulate FCM/APNs call
        return {
            success: true,
            messageId: `push_${Math.random().toString(36).substring(7)}`,
        };
    }
};
exports.PushProvider = PushProvider;
exports.PushProvider = PushProvider = PushProvider_1 = __decorate([
    (0, common_1.Injectable)()
], PushProvider);
