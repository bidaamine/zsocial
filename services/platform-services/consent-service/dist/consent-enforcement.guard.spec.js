"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const consent_enforcement_guard_1 = require("./consent-enforcement.guard");
const consent_service_1 = require("./consent.service");
const common_1 = require("@nestjs/common");
describe('ConsentEnforcementGuard', () => {
    let guard;
    let service;
    beforeEach(() => {
        service = new consent_service_1.ConsentService();
        guard = new consent_enforcement_guard_1.ConsentEnforcementGuard(service);
    });
    it('should block if userId is missing', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {}, route: { path: '/test' } }),
            }),
        };
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(false);
    });
    it('should throw ForbiddenException if consent is not granted', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: { 'x-user-id': 'user1' }, route: { path: '/test' } }),
            }),
        };
        await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.ForbiddenException);
    });
    it('should return true if consent is granted', async () => {
        await service.updateConsent('user1', { allowHealthDataForAI: true });
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: { 'x-user-id': 'user1' }, route: { path: '/test' } }),
            }),
        };
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
    });
});
