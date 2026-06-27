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
const media_access_guard_1 = require("./media-access.guard");
const common_1 = require("@nestjs/common");
const jwt = __importStar(require("jsonwebtoken"));
jest.mock('jsonwebtoken');
describe('MediaAccessGuard', () => {
    let guard;
    beforeEach(() => {
        guard = new media_access_guard_1.MediaAccessGuard();
        // Stub dynamic public key getter to avoid real HTTP requests during unit testing
        guard.getPublicKey = jest.fn().mockResolvedValue('fake-public-key');
        // Stub jwt.verify
        jwt.verify.mockImplementation(() => ({
            sub: 'user123',
            email: 'user@nexus.ai',
            roles: ['user'],
        }));
    });
    it('should throw UnauthorizedException if no auth header is provided', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({ headers: {} })
            })
        };
        await expect(guard.canActivate(mockContext)).rejects.toThrow(common_1.UnauthorizedException);
    });
    it('should return true and enrich request if a valid token is provided', async () => {
        const requestObj = { headers: { authorization: 'Bearer valid-token' } };
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => requestObj
            })
        };
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
        expect(requestObj.user).toEqual({
            sub: 'user123',
            email: 'user@nexus.ai',
            roles: ['user'],
        });
    });
});
