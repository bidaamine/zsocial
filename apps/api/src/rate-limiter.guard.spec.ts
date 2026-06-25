import { RateLimiterGuard } from './rate-limiter.guard';
import { ExecutionContext, HttpException } from '@nestjs/common';

describe('RateLimiterGuard', () => {
  let guard: RateLimiterGuard;

  beforeEach(() => {
    guard = new RateLimiterGuard();
  });

  it('should allow under limit', () => {
    const mockContext = { switchToHttp: () => ({ getRequest: () => ({ ip: '1.1.1.1' }) }) } as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should block over limit', () => {
    const mockContext = { switchToHttp: () => ({ getRequest: () => ({ ip: '1.1.1.1' }) }) } as ExecutionContext;
    for (let i = 0; i < 101; i++) {
      guard.canActivate(mockContext);
    }
    expect(() => guard.canActivate(mockContext)).toThrow(HttpException);
  });
});
