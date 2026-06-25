"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregatorService = void 0;
const common_1 = require("@nestjs/common");
let AggregatorService = class AggregatorService {
    async getWebDashboardData(userId) {
        return {
            userId,
            surface: 'web',
            feeds: ['news', 'family'],
            notifications: 5
        };
    }
    async getMobileAppData(userId) {
        return {
            userId,
            surface: 'mobile',
            feeds: ['news'],
            notifications: 2,
            pushEnabled: true
        };
    }
};
exports.AggregatorService = AggregatorService;
exports.AggregatorService = AggregatorService = __decorate([
    (0, common_1.Injectable)()
], AggregatorService);
