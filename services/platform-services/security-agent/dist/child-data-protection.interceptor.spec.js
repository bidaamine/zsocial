"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_data_protection_interceptor_1 = require("./child-data-protection.interceptor");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
describe('ChildDataProtectionInterceptor', () => {
    let interceptor;
    beforeEach(() => {
        interceptor = new child_data_protection_interceptor_1.ChildDataProtectionInterceptor();
    });
    it('should block child data requests without parental key', () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    headers: { 'x-target-age-group': 'child' }
                }),
            }),
        };
        const mockHandler = { handle: () => (0, rxjs_1.of)('next') };
        expect(() => interceptor.intercept(mockContext, mockHandler)).toThrow(common_1.ForbiddenException);
    });
    it('should allow child data requests with parental key', () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    headers: {
                        'x-target-age-group': 'child',
                        'x-parent-cryptographic-key': 'valid-key'
                    }
                }),
            }),
        };
        const mockHandler = { handle: () => (0, rxjs_1.of)('next') };
        expect(() => interceptor.intercept(mockContext, mockHandler)).not.toThrow();
    });
    it('should allow regular data requests without parental key', () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {} }),
            }),
        };
        const mockHandler = { handle: () => (0, rxjs_1.of)('next') };
        expect(() => interceptor.intercept(mockContext, mockHandler)).not.toThrow();
    });
});
