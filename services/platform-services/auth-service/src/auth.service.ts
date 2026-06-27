import { Injectable, Logger, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeysService } from './keys/keys.service';
import { KafkaService } from './kafka/kafka.service';
import { User, UserArchetype } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserDevice } from './entities/user-device.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly keysService: KeysService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(UserDevice)
    private readonly userDeviceRepository: Repository<UserDevice>,
    private readonly kafkaService: KafkaService
  ) {}

  async logAuditEvent(actor: string, action: string, resource: string) {
    const eventId = `evt-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    this.logger.log(`Logging audit event: actor=${actor}, action=${action}, resource=${resource}`);
    try {
      await fetch('http://localhost:4109/telemetry/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, actor, action, resource })
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log audit event in audit-observability-service: ${err.message}`);
    }
  }

  async register(email: string, password: string, archetype: UserArchetype = 'personal') {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = this.userRepository.create({
      email,
      passwordHash,
      archetype,
      failedLoginAttempts: 0,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
    });

    await this.userRepository.save(user);
    this.logger.log(`Registered new user: ${email}`);

    // Publish event to Kafka
    this.kafkaService.publishEvent('auth.user.registered', {
      userId: user.id,
      email: user.email,
      archetype: user.archetype,
      timestamp: new Date().toISOString()
    });

    // Dispatch welcome notification via Notification Service Kafka event
    this.kafkaService.publishEvent('dispatch_notification', {
      userId: user.id,
      channel: 'email',
      templateKey: 'welcome',
      recipient: user.email,
      variables: { username: user.email.split('@')[0] }
    });

    // Write to audit log
    await this.logAuditEvent('system', 'USER_REGISTER', user.id);

    // Resilient call to initialize default consents in consent-service
    try {
      await fetch('http://localhost:4104/consent/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          updates: {
            allowHealthDataForAI: false,
            allowMarketing: false,
            allowThirdPartyMarketplace: false,
          }
        })
      });
      this.logger.log(`Initialized default consents for user ${user.id}`);
    } catch (err: any) {
      this.logger.warn(`Failed to initialize consents in consent-service: ${err.message}`);
    }

    return {
      success: true,
      message: 'Registration successful. Email verification token generated.',
      verificationToken, 
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
      select: ['id', 'email', 'emailVerified', 'verificationTokenExpiresAt'] as any
    });

    if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiresAt = null;
    await this.userRepository.save(user);

    await this.logAuditEvent(user.id, 'EMAIL_VERIFIED', user.email);

    return { success: true, message: 'Email verified successfully.' };
  }

  async login(email: string, password: string, deviceFingerprint?: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['mfaConfig'],
      select: ['id', 'email', 'passwordHash', 'archetype', 'failedLoginAttempts', 'lockoutUntil'] as any
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 1000 / 60);
      throw new UnauthorizedException(`Account is temporarily locked. Try again in ${remainingTime} minutes.`);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
        this.logger.warn(`User ${email} locked out due to multiple failed login attempts`);
        await this.logAuditEvent(user.id, 'ACCOUNT_LOCKOUT', 'lockout');
      }
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login counter on success
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await this.userRepository.save(user);

    // Check if MFA is enabled
    if (user.mfaConfig?.isEnabled) {
      return {
        mfaRequired: true,
        userId: user.id,
      };
    }

    // Publish login event
    this.kafkaService.publishEvent('auth.user.logged_in', {
      userId: user.id,
      email: user.email,
      archetype: user.archetype,
      loginType: 'password',
      ipAddress,
      deviceFingerprint,
      timestamp: new Date().toISOString()
    });

    // Write audit log
    await this.logAuditEvent(user.id, 'USER_LOGIN', 'credentials');

    // Issue tokens
    return this.generateTokenPair(user, ['user'], deviceFingerprint, ipAddress);
  }

  async mfaLogin(userId: string, isMfaVerified: boolean, deviceFingerprint?: string, ipAddress?: string) {
    if (!isMfaVerified) {
      throw new UnauthorizedException('MFA verification failed');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    this.kafkaService.publishEvent('auth.user.logged_in', {
      userId: user.id,
      email: user.email,
      archetype: user.archetype,
      loginType: 'mfa',
      ipAddress,
      deviceFingerprint,
      timestamp: new Date().toISOString()
    });

    await this.logAuditEvent(user.id, 'USER_LOGIN', 'mfa');

    return this.generateTokenPair(user, ['user'], deviceFingerprint, ipAddress);
  }

  async generateTokenPair(user: User, roles: string[], deviceFingerprint?: string, ipAddress?: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      archetype: user.archetype,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.keysService.getPrivateKey(),
      algorithm: 'RS256',
      expiresIn: '1h',
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: rawRefreshToken,
      expiresAt,
      deviceFingerprint: deviceFingerprint || 'unknown_fingerprint',
      ipAddress: ipAddress || '127.0.0.1',
      user,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    // Track Device details
    if (deviceFingerprint) {
      try {
        let device = await this.userDeviceRepository.findOne({
          where: { userId: user.id, deviceFingerprint }
        });

        if (!device) {
          device = this.userDeviceRepository.create({
            userId: user.id,
            deviceFingerprint,
            deviceName: 'Web Browser Client',
            isTrusted: false, // Flagged untrusted until confirmed
            lastLoginAt: new Date(),
            lastIpAddress: ipAddress || '127.0.0.1',
            user,
          });
          await this.userDeviceRepository.save(device);

          // Alert user via Kafka event
          this.kafkaService.publishEvent('dispatch_notification', {
            userId: user.id,
            channel: 'email',
            templateKey: 'new_device_login',
            recipient: user.email,
            variables: { ip: ipAddress || '127.0.0.1' },
          });
          this.logger.log(`New device fingerprint detected for user ${user.id}: dispatching notification alert`);
        } else {
          device.lastLoginAt = new Date();
          device.lastIpAddress = ipAddress || '127.0.0.1';
          await this.userDeviceRepository.save(device);
        }
      } catch (err: any) {
        this.logger.error(`Failed to record/update user device fingerprint: ${err.message}`);
      }
    }

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        archetype: user.archetype,
        roles,
      }
    };
  }

  async getActiveSessions(userId: string) {
    return this.refreshTokenRepository.find({
      where: { user: { id: userId }, isRevoked: false },
      order: { createdAt: 'DESC' }
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const token = await this.refreshTokenRepository.findOne({
      where: { id: sessionId, user: { id: userId } }
    });
    if (!token) {
      throw new BadRequestException('Session not found');
    }
    token.isRevoked = true;
    return this.refreshTokenRepository.save(token);
  }

  async revokeOtherSessions(userId: string, currentToken: string) {
    const active = await this.refreshTokenRepository.find({
      where: { user: { id: userId }, isRevoked: false }
    });
    for (const session of active) {
      if (session.token !== currentToken) {
        session.isRevoked = true;
        await this.refreshTokenRepository.save(session);
      }
    }
    return { success: true };
  }

  async getTrustedDevices(userId: string) {
    return this.userDeviceRepository.find({
      where: { userId }
    });
  }

  async toggleDeviceTrust(userId: string, deviceId: string, isTrusted: boolean) {
    const device = await this.userDeviceRepository.findOne({
      where: { id: deviceId, userId }
    });
    if (!device) {
      throw new BadRequestException('Device not found');
    }
    device.isTrusted = isTrusted;
    return this.userDeviceRepository.save(device);
  }

  async refresh(rawRefreshToken: string, deviceFingerprint?: string, ipAddress?: string) {
    const refreshTokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: rawRefreshToken },
      relations: ['user'],
    });

    if (!refreshTokenEntity || refreshTokenEntity.isRevoked || refreshTokenEntity.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token (Token rotation!)
    refreshTokenEntity.isRevoked = true;
    await this.refreshTokenRepository.save(refreshTokenEntity);

    await this.logAuditEvent(refreshTokenEntity.user.id, 'TOKEN_REFRESH', 'session');

    // Issue new pair
    return this.generateTokenPair(refreshTokenEntity.user, ['user'], deviceFingerprint, ipAddress);
  }

  async logout(rawRefreshToken: string) {
    const refreshTokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: rawRefreshToken },
      relations: ['user']
    });

    if (refreshTokenEntity) {
      refreshTokenEntity.isRevoked = true;
      await this.refreshTokenRepository.save(refreshTokenEntity);
      await this.logAuditEvent(refreshTokenEntity.user.id, 'USER_LOGOUT', 'session');
    }

    return { success: true };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.keysService.getPublicKey(),
        algorithms: ['RS256'],
      });
      return payload;
    } catch (e: any) {
      this.logger.warn(`Token validation failed: ${e.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  getPublicKey(): string {
    return this.keysService.getPublicKey();
  }

  getJwks() {
    const pubKeyPem = this.keysService.getPublicKey();
    const jwk = crypto.createPublicKey(pubKeyPem).export({ format: 'jwk' }) as any;
    
    return {
      keys: [
        {
          kty: jwk.kty,
          use: 'sig',
          alg: 'RS256',
          kid: 'nexus-key-id',
          n: jwk.n,
          e: jwk.e,
        }
      ]
    };
  }

  async deleteUserAndNotify(jobId: string, userId: string): Promise<void> {
    this.logger.log(`GDPR Delete: Deleting user ${userId} for Job: ${jobId}`);
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.userRepository.remove(user);
        this.logger.log(`GDPR Delete: Successfully removed user ${userId}`);
      } else {
        this.logger.warn(`GDPR Delete: User ${userId} not found`);
      }
      
      this.kafkaService.publishEvent('auth.user.deleted', {
        jobId,
        userId,
        status: 'DELETED',
        timestamp: new Date().toISOString()
      });
      this.logger.log(`Published auth.user.deleted event for user ${userId}`);
    } catch (err: any) {
      this.logger.error(`GDPR Delete: Failed to delete user ${userId}: ${err.message}`);
    }
  }
}
