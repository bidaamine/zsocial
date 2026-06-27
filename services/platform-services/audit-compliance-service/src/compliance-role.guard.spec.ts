import { ComplianceRoleGuard } from './compliance-role.guard';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('ComplianceRoleGuard', () => {
  let guard: ComplianceRoleGuard;

  beforeEach(() => {
    guard = new ComplianceRoleGuard();
    // Stub dynamic public key getter to avoid real HTTP requests during unit testing
    (guard as any).getPublicKey = jest.fn().mockResolvedValue('fake-public-key');

    // Stub jwt.verify
    (jwt.verify as jest.Mock).mockImplementation(() => ({
      sub: 'user123',
      email: 'user@nexus.ai',
      roles: ['user'], // default non-auditor role
    }));
  });

  it('should throw UnauthorizedException if no auth header is provided', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} })
      })
    } as ExecutionContext;
    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if user has normal user roles but not compliance role', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer token' } })
      })
    } as ExecutionContext;
    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it('should return true and enrich request if user has the compliance role', async () => {
    // Modify jwt.verify stub to return auditor role
    (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
      sub: 'compliance-officer-9',
      email: 'audit@nexus.ai',
      roles: ['compliance'],
    }));

    const requestObj: any = { headers: { authorization: 'Bearer token' } };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => requestObj
      })
    } as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(requestObj.user.sub).toBe('compliance-officer-9');
  });
});
