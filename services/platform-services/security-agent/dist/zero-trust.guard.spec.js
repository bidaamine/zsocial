"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zero_trust_guard_1 = require("./zero-trust.guard");
const common_1 = require("@nestjs/common");
describe('ZeroTrustGuard', () => {
    let guard;
    beforeEach(() => {
        guard = new zero_trust_guard_1.ZeroTrustGuard();
    });
    it('should throw UnauthorizedException if no token is provided', () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {} }),
            }),
        };
        expect(() => guard.canActivate(mockContext)).toThrow(common_1.UnauthorizedException);
    });
    it('should return true if token is provided', () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: { authorization: 'Bearer token' } }),
            }),
        };
        expect(guard.canActivate(mockContext)).toBe(true);
    });
});
