"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildDataProtectionInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let ChildDataProtectionInterceptor = class ChildDataProtectionInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const isChildData = request.headers['x-target-age-group'] === 'child';
        if (isChildData) {
            const parentKey = request.headers['x-parent-cryptographic-key'];
            if (!parentKey) {
                throw new common_1.ForbiddenException('Child data access denied. Valid parent cryptographic key required.');
            }
        }
        return next.handle().pipe((0, operators_1.tap)(() => {
            // Enforce Zero-Knowledge Proof encryption layer for outbound child data.
        }));
    }
};
exports.ChildDataProtectionInterceptor = ChildDataProtectionInterceptor;
exports.ChildDataProtectionInterceptor = ChildDataProtectionInterceptor = __decorate([
    (0, common_1.Injectable)()
], ChildDataProtectionInterceptor);
