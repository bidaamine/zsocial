"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const media_access_guard_1 = require("./media-access.guard");
const common_1 = require("@nestjs/common");
describe('MediaAccessGuard', () => {
    let guard;
    beforeEach(() => {
        guard = new media_access_guard_1.MediaAccessGuard();
    });
    it('should block if no auth header', () => {
        const mockContext = { switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) };
        expect(() => guard.canActivate(mockContext)).toThrow(common_1.ForbiddenException);
    });
    it('should allow if auth header exists', () => {
        const mockContext = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer token' } }) }) };
        expect(guard.canActivate(mockContext)).toBe(true);
    });
});
