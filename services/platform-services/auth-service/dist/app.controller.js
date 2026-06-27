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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./jwt/jwt-auth.guard");
let AppController = class AppController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    getHealth() {
        return 'auth-service is healthy and operational.';
    }
    async register(body) {
        const pwd = body.password || body.passwordHash;
        if (!body.email || !pwd) {
            throw new common_1.BadRequestException('Email and password are required');
        }
        return this.authService.register(body.email, pwd, body.archetype || 'personal');
    }
    async verifyEmail(token) {
        if (!token) {
            throw new common_1.BadRequestException('Verification token is required');
        }
        return this.authService.verifyEmail(token);
    }
    async login(body, ip, userAgent) {
        if (!body.email || !body.password) {
            throw new common_1.BadRequestException('Email and password are required');
        }
        const fingerprint = body.deviceFingerprint || userAgent || 'unknown';
        return this.authService.login(body.email, body.password, fingerprint, ip);
    }
    async refresh(refreshToken, deviceFingerprint, ip, userAgent) {
        if (!refreshToken) {
            throw new common_1.BadRequestException('Refresh token is required');
        }
        const fingerprint = deviceFingerprint || userAgent || 'unknown';
        return this.authService.refresh(refreshToken, fingerprint, ip);
    }
    async logout(refreshToken) {
        if (!refreshToken) {
            throw new common_1.BadRequestException('Refresh token is required');
        }
        return this.authService.logout(refreshToken);
    }
    async getSessions(req) {
        return this.authService.getActiveSessions(req.user.sub);
    }
    async revokeSession(req, sessionId) {
        return this.authService.revokeSession(req.user.sub, sessionId);
    }
    async revokeOtherSessions(req, currentRefreshToken) {
        if (!currentRefreshToken) {
            throw new common_1.BadRequestException('Current refresh token is required');
        }
        return this.authService.revokeOtherSessions(req.user.sub, currentRefreshToken);
    }
    async getDevices(req) {
        return this.authService.getTrustedDevices(req.user.sub);
    }
    async toggleDeviceTrust(req, deviceId, isTrusted) {
        return this.authService.toggleDeviceTrust(req.user.sub, deviceId, isTrusted);
    }
    async getStatus(req) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token)
            return { valid: false };
        try {
            const payload = await this.authService.validateToken(token);
            return { valid: true, payload };
        }
        catch {
            return { valid: false };
        }
    }
    getJwks() {
        return this.authService.getJwks();
    }
    getPublicKey() {
        return this.authService.getPublicKey();
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('verify-email'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)('refreshToken')),
    __param(1, (0, common_1.Body)('deviceFingerprint')),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "logout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSessions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('sessions/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "revokeSession", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('sessions/other'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "revokeOtherSessions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('devices'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getDevices", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)('devices/:id/trust'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('isTrusted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Boolean]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "toggleDeviceTrust", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('.well-known/jwks.json'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getJwks", null);
__decorate([
    (0, common_1.Get)('public-key'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getPublicKey", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AppController);
