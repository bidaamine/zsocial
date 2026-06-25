import { MediaAccessGuard } from './media-access.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('MediaAccessGuard', () => {
  let guard: MediaAccessGuard;

  beforeEach(() => {
    guard = new MediaAccessGuard();
  });

  it('should block if no auth header', () => {
    const mockContext = { switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) } as ExecutionContext;
    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should allow if auth header exists', () => {
    const mockContext = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer token' } }) }) } as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
