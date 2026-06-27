import { MediaAccessGuard } from './media-access.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('MediaAccessGuard', () => {
  let guard: MediaAccessGuard;

  beforeEach(() => {
    guard = new MediaAccessGuard();
    // Stub dynamic public key getter to avoid real HTTP requests during unit testing
    (guard as any).getPublicKey = jest.fn().mockResolvedValue('fake-public-key');

    // Stub jwt.verify
    (jwt.verify as jest.Mock).mockImplementation(() => ({
      sub: 'user123',
      email: 'user@nexus.ai',
      roles: ['user'],
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

  it('should return true and enrich request if a valid token is provided', async () => {
    const requestObj: any = { headers: { authorization: 'Bearer valid-token' } };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => requestObj
      })
    } as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(requestObj.user).toEqual({
      sub: 'user123',
      email: 'user@nexus.ai',
      roles: ['user'],
    });
  });
});
