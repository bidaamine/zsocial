"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var MediaAccessGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaAccessGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt = __importStar(require("jsonwebtoken"));
let MediaAccessGuard = MediaAccessGuard_1 = class MediaAccessGuard {
    logger = new common_1.Logger(MediaAccessGuard_1.name);
    cachedPublicKey = null;
    cacheExpiry = 0;
    AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4100';
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Zero-Trust Policy: Missing Authorization Header');
        }
        const [type, token] = authHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            throw new common_1.UnauthorizedException('Zero-Trust Policy: Invalid Authorization format');
        }
        try {
            const publicKey = await this.getPublicKey();
            const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
            request.user = {
                sub: payload.sub,
                email: payload.email,
                roles: payload.roles || []
            };
            return true;
        }
        catch (err) {
            this.logger.warn(`Zero-Trust validation failed: ${err.message}`);
            throw new common_1.UnauthorizedException('Zero-Trust Policy: Invalid or expired token');
        }
    }
    async getPublicKey() {
        if (this.cachedPublicKey && this.cacheExpiry > Date.now()) {
            return this.cachedPublicKey;
        }
        try {
            const response = await fetch(`${this.AUTH_SERVICE_URL}/api/auth/public-key`);
            if (!response.ok)
                throw new Error(`HTTP status: ${response.status}`);
            const text = await response.text();
            if (text && text.trim().startsWith('-----BEGIN PUBLIC KEY-----')) {
                this.cachedPublicKey = text.trim();
                this.cacheExpiry = Date.now() + 24 * 60 * 60 * 1000;
                return this.cachedPublicKey;
            }
            throw new Error('Invalid public key structure');
        }
        catch (error) {
            this.logger.error(`Failed to fetch public key: ${error.message}`);
            if (this.cachedPublicKey)
                return this.cachedPublicKey;
            throw new common_1.UnauthorizedException('Zero-Trust Policy: Secure identity provider key store unavailable');
        }
    }
};
exports.MediaAccessGuard = MediaAccessGuard;
exports.MediaAccessGuard = MediaAccessGuard = MediaAccessGuard_1 = __decorate([
    (0, common_1.Injectable)()
], MediaAccessGuard);
