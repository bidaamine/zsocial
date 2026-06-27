import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { MfaConfig } from '../entities/mfa-config.entity';

@Injectable()
export class MfaService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MfaConfig)
    private readonly mfaConfigRepository: Repository<MfaConfig>
  ) {}

  async generateTotpSecret(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['mfaConfig'] });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'NEXUS', secret);

    let mfaConfig = user.mfaConfig;
    if (!mfaConfig) {
      mfaConfig = this.mfaConfigRepository.create({
        user,
        isEnabled: false,
        secret,
        recoveryCodes: this.generateRecoveryCodes()
      });
    } else {
      mfaConfig.secret = secret;
      mfaConfig.isEnabled = false;
      mfaConfig.recoveryCodes = this.generateRecoveryCodes();
    }
    await this.mfaConfigRepository.save(mfaConfig);

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    
    return {
      secret,
      qrCodeDataUrl,
      recoveryCodes: mfaConfig.recoveryCodes
    };
  }

  async verifyTotpToken(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['mfaConfig'] });
    if (!user || !user.mfaConfig) {
      throw new BadRequestException('MFA not configured for user');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.mfaConfig.secret
    });

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP token');
    }

    user.mfaConfig.isEnabled = true;
    await this.mfaConfigRepository.save(user.mfaConfig);

    return { success: true, message: 'MFA successfully enabled' };
  }

  async validateMfaLogin(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['mfaConfig'] });
    if (!user || !user.mfaConfig || !user.mfaConfig.isEnabled) {
      throw new BadRequestException('MFA not enabled for user');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.mfaConfig.secret
    });

    if (!isValid) {
      // Check recovery codes
      if (user.mfaConfig.recoveryCodes.includes(token)) {
        user.mfaConfig.recoveryCodes = user.mfaConfig.recoveryCodes.filter(c => c !== token);
        await this.mfaConfigRepository.save(user.mfaConfig);
        return true;
      }
      throw new BadRequestException('Invalid TOTP token or recovery code');
    }

    return true;
  }

  private generateRecoveryCodes(count = 8): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}
