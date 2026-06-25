import { ZeroTrustGuard } from './zero-trust.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('ZeroTrustGuard', () => {
  let guard: ZeroTrustGuard;

  beforeEach(() => {
    guard = new ZeroTrustGuard();
  });

  it('should throw UnauthorizedException if no token is provided', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should return true if token is provided', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer token' } }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
