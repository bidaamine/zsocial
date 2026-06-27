import { ConsentEnforcementGuard } from './consent-enforcement.guard';
import { ConsentService } from './consent.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('ConsentEnforcementGuard', () => {
  let guard: ConsentEnforcementGuard;
  let service: ConsentService;
  let reflector: Reflector;
  let isAllowed = false;
  let requiredConsentField: string | null = 'allowHealthDataForAI';

  beforeEach(() => {
    service = { 
      verifyConsent: jest.fn().mockImplementation(() => Promise.resolve(isAllowed)),
      updateConsent: jest.fn()
    } as any;

    reflector = {
      getAllAndOverride: jest.fn().mockImplementation(() => requiredConsentField),
    } as any;

    guard = new ConsentEnforcementGuard(service, reflector);
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
    } as ExecutionContext;
    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access if no consent is required', async () => {
    requiredConsentField = null;
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, route: { path: '/test' } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
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
    } as ExecutionContext;
    
    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
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
    } as ExecutionContext;
    
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});
