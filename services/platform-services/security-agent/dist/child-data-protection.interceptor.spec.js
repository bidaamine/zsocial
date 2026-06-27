"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_data_protection_interceptor_1 = require("./child-data-protection.interceptor");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
describe('ChildDataProtectionInterceptor', () => {
    let interceptor;
    let mockZkpService;
    const validKey = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    beforeEach(() => {
        mockZkpService = {
            encryptChildData: jest.fn().mockImplementation((data) => ({ ciphertext: 'encrypted', iv: 'iv', authTag: 'tag' })),
            decryptChildData: jest.fn().mockImplementation(() => 'decrypted-cleartext'),
        };
        interceptor = new child_data_protection_interceptor_1.ChildDataProtectionInterceptor(mockZkpService);
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
    it('should allow child data requests with a valid 32-byte (64 hex) parental key', () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    headers: {
                        'x-target-age-group': 'child',
                        'x-parent-cryptographic-key': validKey
                    },
                    body: { name: 'Bobby', age: 10 }
                }),
            }),
        };
        const mockHandler = { handle: () => (0, rxjs_1.of)('next') };
        expect(() => interceptor.intercept(mockContext, mockHandler)).not.toThrow();
    });
    it('should encrypt inbound sensitive fields in request body', (done) => {
        const requestObj = {
            headers: {
                'x-target-age-group': 'child',
                'x-parent-cryptographic-key': validKey
            },
            body: { name: 'Bobby', bio: 'I like games', other: 'public' }
        };
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => requestObj,
            }),
        };
        const mockHandler = { handle: () => (0, rxjs_1.of)('next') };
        interceptor.intercept(mockContext, mockHandler).subscribe(() => {
            // Inbound check
            expect(requestObj.body.name).toEqual({ ciphertext: 'encrypted', iv: 'iv', authTag: 'tag' });
            expect(requestObj.body.bio).toEqual({ ciphertext: 'encrypted', iv: 'iv', authTag: 'tag' });
            expect(requestObj.body.other).toEqual('public'); // public field left cleartext
            done();
        });
    });
    it('should decrypt outbound GCM payloads in response data', (done) => {
        const requestObj = {
            headers: {
                'x-target-age-group': 'child',
                'x-parent-cryptographic-key': validKey
            }
        };
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => requestObj,
            }),
        };
        const responsePayload = {
            name: { ciphertext: 'enc1', iv: 'iv1', authTag: 'tag1' },
            publicField: 'hello'
        };
        const mockHandler = { handle: () => (0, rxjs_1.of)(responsePayload) };
        interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
            // Outbound check
            expect(result.name).toEqual('decrypted-cleartext');
            expect(result.publicField).toEqual('hello');
            done();
        });
    });
});
