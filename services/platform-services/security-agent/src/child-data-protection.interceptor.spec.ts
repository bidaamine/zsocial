import { ChildDataProtectionInterceptor } from './child-data-protection.interceptor';
import { ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';

describe('ChildDataProtectionInterceptor', () => {
  let interceptor: ChildDataProtectionInterceptor;
  let mockZkpService: any;
  const validKey = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

  beforeEach(() => {
    mockZkpService = { 
      encryptChildData: jest.fn().mockImplementation((data) => ({ ciphertext: 'encrypted', iv: 'iv', authTag: 'tag' })),
      decryptChildData: jest.fn().mockImplementation(() => 'decrypted-cleartext'),
    } as any;
    interceptor = new ChildDataProtectionInterceptor(mockZkpService);
  });

  it('should block child data requests without parental key', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-target-age-group': 'child' }
        }),
      }),
    } as ExecutionContext;
    const mockHandler: CallHandler = { handle: () => of('next') };

    expect(() => interceptor.intercept(mockContext, mockHandler)).toThrow(ForbiddenException);
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
    } as ExecutionContext;
    const mockHandler: CallHandler = { handle: () => of('next') };

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
    } as ExecutionContext;
    
    const mockHandler: CallHandler = { handle: () => of('next') };
    
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
    } as ExecutionContext;
    
    const responsePayload = {
      name: { ciphertext: 'enc1', iv: 'iv1', authTag: 'tag1' },
      publicField: 'hello'
    };
    
    const mockHandler: CallHandler = { handle: () => of(responsePayload) };
    
    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      // Outbound check
      expect(result.name).toEqual('decrypted-cleartext');
      expect(result.publicField).toEqual('hello');
      done();
    });
  });
});
