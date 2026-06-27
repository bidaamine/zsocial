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
Object.defineProperty(exports, "__esModule", { value: true });
const zero_trust_guard_1 = require("./zero-trust.guard");
const common_1 = require("@nestjs/common");
const jwt = __importStar(require("jsonwebtoken"));
jest.mock('jsonwebtoken');
describe('ZeroTrustGuard', () => {
    let guard;
    let threatDetectionServiceMock;
    let riskScore = 0;
    beforeEach(() => {
        threatDetectionServiceMock = {
            assessRisk: jest.fn().mockImplementation(() => Promise.resolve(riskScore)),
        };
        guard = new zero_trust_guard_1.ZeroTrustGuard(threatDetectionServiceMock);
        // Stub getPublicKey to avoid HTTP calls to auth-service during testing
        guard.getPublicKey = jest.fn().mockResolvedValue('fake-public-key');
        // Stub jwt.verify
        jwt.verify.mockImplementation(() => ({
            sub: 'user123',
            email: 'user@nexus.ai',
            archetype: 'personal',
            roles: ['user'],
        }));
    });
    it('should throw UnauthorizedException if no token is provided', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {} }),
            }),
        };
        await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.UnauthorizedException);
    });
    it('should return true if token is provided and risk is low', async () => {
        riskScore = 20;
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    headers: { authorization: 'Bearer token' },
                    ip: '127.0.0.1',
                    method: 'GET',
                    url: '/test',
                }),
            }),
        };
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
    });
    it('should throw ForbiddenException if risk score is high (threat block)', async () => {
        riskScore = 80;
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    headers: { authorization: 'Bearer token' },
                    ip: '12.34.56.78',
                    method: 'GET',
                    url: '/test',
                }),
            }),
        };
        await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.ForbiddenException);
    });
});
