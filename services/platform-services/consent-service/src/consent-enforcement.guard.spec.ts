import { ConsentEnforcementGuard } from './consent-enforcement.guard';
import { ConsentService } from './consent.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('ConsentEnforcementGuard', () => {
  let guard: ConsentEnforcementGuard;
  let service: ConsentService;

  beforeEach(() => {
    service = new ConsentService();
    guard = new ConsentEnforcementGuard(service);
  });

  it('should block if userId is missing', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, route: { path: '/test' } }),
      }),
    } as ExecutionContext;
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(false);
  });

  it('should throw ForbiddenException if consent is not granted', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-user-id': 'user1' }, route: { path: '/test' } }),
      }),
    } as ExecutionContext;
    
    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it('should return true if consent is granted', async () => {
    await service.updateConsent('user1', { allowHealthDataForAI: true });
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-user-id': 'user1' }, route: { path: '/test' } }),
      }),
    } as ExecutionContext;
    
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});
