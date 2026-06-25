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
exports.RateLimiterGuard = void 0;
const common_1 = require("@nestjs/common");
const core_infra_1 = require("@nexus/core-infra");
let RateLimiterGuard = class RateLimiterGuard {
    redisService;
    limit = 100;
    windowMs = 60000;
    constructor(redisService) {
        this.redisService = redisService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const ip = request.ip || '127.0.0.1';
        const key = `rate-limit:${ip}`;
        const current = await this.redisService.get(key);
        let count = current ? parseInt(current, 10) : 0;
        count++;
        if (count === 1) {
            await this.redisService.set(key, count.toString(), this.windowMs / 1000);
        }
        else {
            await this.redisService.getClient().incr(key);
        }
        if (count > this.limit) {
            throw new common_1.HttpException('Too Many Requests', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
};
exports.RateLimiterGuard = RateLimiterGuard;
exports.RateLimiterGuard = RateLimiterGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_infra_1.RedisService])
], RateLimiterGuard);
