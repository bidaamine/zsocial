"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rate_limiter_guard_1 = require("./rate-limiter.guard");
const common_1 = require("@nestjs/common");
describe('RateLimiterGuard', () => {
    let guard;
    beforeEach(() => {
        guard = new rate_limiter_guard_1.RateLimiterGuard();
    });
    it('should allow under limit', () => {
        const mockContext = { switchToHttp: () => ({ getRequest: () => ({ ip: '1.1.1.1' }) }) };
        expect(guard.canActivate(mockContext)).toBe(true);
    });
    it('should block over limit', () => {
        const mockContext = { switchToHttp: () => ({ getRequest: () => ({ ip: '1.1.1.1' }) }) };
        for (let i = 0; i < 101; i++) {
            guard.canActivate(mockContext);
        }
        expect(() => guard.canActivate(mockContext)).toThrow(common_1.HttpException);
    });
});
