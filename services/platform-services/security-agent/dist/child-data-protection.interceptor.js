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
exports.ChildDataProtectionInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const zkp_service_1 = require("./zkp.service");
let ChildDataProtectionInterceptor = class ChildDataProtectionInterceptor {
    zkpService;
    constructor(zkpService) {
        this.zkpService = zkpService;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const isChildData = request.headers['x-target-age-group'] === 'child';
        const parentKey = request.headers['x-parent-cryptographic-key'];
        if (isChildData) {
            if (!parentKey || parentKey.length !== 64) {
                throw new common_1.ForbiddenException('Child data access denied. Valid 32-byte parent cryptographic key (64 hex characters) required.');
            }
            // Inbound Request Encryption
            if (request.body && typeof request.body === 'object') {
                request.body = this.traverseAndEncrypt(request.body, parentKey);
            }
        }
        return next.handle().pipe((0, operators_1.map)(data => {
            // Outbound Response Decryption
            if (isChildData && data && parentKey) {
                return this.traverseAndDecrypt(data, parentKey);
            }
            return data;
        }));
    }
    traverseAndEncrypt(obj, parentKey) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.traverseAndEncrypt(item, parentKey));
        }
        const sensitiveFields = new Set(['bio', 'name', 'address']);
        const encrypted = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveFields.has(lowerKey) && typeof value === 'string') {
                try {
                    encrypted[key] = this.zkpService.encryptChildData(value, parentKey);
                }
                catch (err) {
                    encrypted[key] = value;
                }
            }
            else if (typeof value === 'object') {
                encrypted[key] = this.traverseAndEncrypt(value, parentKey);
            }
            else {
                encrypted[key] = value;
            }
        }
        return encrypted;
    }
    traverseAndDecrypt(obj, parentKey) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.traverseAndDecrypt(item, parentKey));
        }
        // Detect if this object itself is an encrypted GCM payload
        if ('ciphertext' in obj && 'iv' in obj && 'authTag' in obj) {
            try {
                return this.zkpService.decryptChildData(obj, parentKey);
            }
            catch (err) {
                // Fallback to original block if decryption fails (e.g. wrong key)
                return obj;
            }
        }
        const decrypted = {};
        for (const [key, value] of Object.entries(obj)) {
            decrypted[key] = this.traverseAndDecrypt(value, parentKey);
        }
        return decrypted;
    }
};
exports.ChildDataProtectionInterceptor = ChildDataProtectionInterceptor;
exports.ChildDataProtectionInterceptor = ChildDataProtectionInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [zkp_service_1.ZkpService])
], ChildDataProtectionInterceptor);
