import { ChildDataProtectionInterceptor } from './child-data-protection.interceptor';
import { ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';

describe('ChildDataProtectionInterceptor', () => {
  let interceptor: ChildDataProtectionInterceptor;

  beforeEach(() => {
    interceptor = new ChildDataProtectionInterceptor();
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
    } as ExecutionContext;
    const mockHandler: CallHandler = { handle: () => of('next') };

    expect(() => interceptor.intercept(mockContext, mockHandler)).not.toThrow();
  });

  it('should allow regular data requests without parental key', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;
    const mockHandler: CallHandler = { handle: () => of('next') };

    expect(() => interceptor.intercept(mockContext, mockHandler)).not.toThrow();
  });
});
