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
var AggregatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregatorService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let AggregatorService = AggregatorService_1 = class AggregatorService {
    httpService;
    logger = new common_1.Logger(AggregatorService_1.name);
    constructor(httpService) {
        this.httpService = httpService;
    }
    async getWebDashboardData(userId, authHeader) {
        this.logger.log(`Aggregating web dashboard data for user ${userId}`);
        try {
            const [profileRes, consentRes, authRes] = await Promise.all([
                (0, rxjs_1.lastValueFrom)(this.httpService.get(`http://user-profile-service:4001/api/profile/${userId}`, { headers: { Authorization: authHeader } }).pipe()).catch(() => ({ data: { status: 'offline' } })),
                (0, rxjs_1.lastValueFrom)(this.httpService.get(`http://consent-service:4106/api/consent/${userId}`, { headers: { Authorization: authHeader } }).pipe()).catch(() => ({ data: { status: 'offline' } })),
                (0, rxjs_1.lastValueFrom)(this.httpService.get(`http://auth-service:4003/api/auth/status`, { headers: { Authorization: authHeader } }).pipe()).catch(() => ({ data: { status: 'offline' } }))
            ]);
            return {
                userId,
                surface: 'web',
                profile: profileRes.data,
                consent: consentRes.data,
                authStatus: authRes.data,
                aggregatedAt: new Date().toISOString()
            };
        }
        catch (e) {
            this.logger.error(`Aggregation failed: ${e.message}`);
            throw e;
        }
    }
    async getMobileAppData(userId, authHeader) {
        const data = await this.getWebDashboardData(userId, authHeader);
        return {
            ...data,
            surface: 'mobile',
            pushEnabled: true,
        };
    }
};
exports.AggregatorService = AggregatorService;
exports.AggregatorService = AggregatorService = AggregatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], AggregatorService);
