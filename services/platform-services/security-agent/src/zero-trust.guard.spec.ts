import { ZeroTrustGuard } from './zero-trust.guard';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('ZeroTrustGuard', () => {
  let guard: ZeroTrustGuard;
  let threatDetectionServiceMock: any;
  let riskScore = 0;

  beforeEach(() => {
    threatDetectionServiceMock = {
      assessRisk: jest.fn().mockImplementation(() => Promise.resolve(riskScore)),
    };
    guard = new ZeroTrustGuard(threatDetectionServiceMock);
    
    // Stub getPublicKey to avoid HTTP calls to auth-service during testing
    (guard as any).getPublicKey = jest.fn().mockResolvedValue('fake-public-key');
    
    // Stub jwt.verify
    (jwt.verify as jest.Mock).mockImplementation(() => ({
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
    } as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
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
    } as ExecutionContext;

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
    } as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });
});
