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
exports.GatewayController = void 0;
const common_1 = require("@nestjs/common");
const gateway_router_service_1 = require("./gateway-router.service");
const rate_limiter_guard_1 = require("./rate-limiter.guard");
const zero_trust_guard_1 = require("./zero-trust.guard");
let GatewayController = class GatewayController {
    router;
    constructor(router) {
        this.router = router;
    }
    healthCheck() {
        return { status: 'Gateway is healthy', layer: 'Edge', zeroTrust: 'active' };
    }
    async proxyRequest(serviceName, req) {
        return this.router.proxy(serviceName, req);
    }
};
exports.GatewayController = GatewayController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GatewayController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.UseGuards)(zero_trust_guard_1.ZeroTrustGuard),
    (0, common_1.All)('route/:serviceName/*'),
    __param(0, (0, common_1.Param)('serviceName')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "proxyRequest", null);
exports.GatewayController = GatewayController = __decorate([
    (0, common_1.Controller)('api'),
    (0, common_1.UseGuards)(rate_limiter_guard_1.RateLimiterGuard),
    __metadata("design:paramtypes", [gateway_router_service_1.GatewayRouterService])
], GatewayController);
