"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const consent_enforcement_guard_1 = require("./consent-enforcement.guard");
const common_1 = require("@nestjs/common");
describe('ConsentEnforcementGuard', () => {
    let guard;
    let service;
    let reflector;
    let isAllowed = false;
    let requiredConsentField = 'allowHealthDataForAI';
    beforeEach(() => {
        service = {
            verifyConsent: jest.fn().mockImplementation(() => Promise.resolve(isAllowed)),
            updateConsent: jest.fn()
        };
        reflector = {
            getAllAndOverride: jest.fn().mockImplementation(() => requiredConsentField),
        };
        guard = new consent_enforcement_guard_1.ConsentEnforcementGuard(service, reflector);
    });
    it('should be defined', () => {
        expect(guard).toBeDefined();
    });
    it('should block if userId is missing and consent is required', async () => {
        requiredConsentField = 'allowHealthDataForAI';
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {}, route: { path: '/test' } }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        };
        await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.ForbiddenException);
    });
    it('should allow access if no consent is required', async () => {
        requiredConsentField = null;
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {}, route: { path: '/test' } }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        };
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
    });
    it('should throw ForbiddenException if consent is not granted', async () => {
        requiredConsentField = 'allowHealthDataForAI';
        isAllowed = false;
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: { 'x-user-id': 'user1' }, route: { path: '/test' } }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        };
        await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.ForbiddenException);
    });
    it('should return true if consent is granted', async () => {
        requiredConsentField = 'allowHealthDataForAI';
        isAllowed = true;
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: { 'x-user-id': 'user1' }, route: { path: '/test' } }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        };
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
    });
});
