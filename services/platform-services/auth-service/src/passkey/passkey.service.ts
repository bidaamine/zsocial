import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} from '@simplewebauthn/server';
import type { 
  GenerateRegistrationOptionsOpts, 
  VerifyRegistrationResponseOpts, 
  GenerateAuthenticationOptionsOpts, 
  VerifyAuthenticationResponseOpts,
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/server';
import { User } from '../entities/user.entity';
import { Passkey } from '../entities/passkey.entity';
import { RedisService } from '@nexus/core-infra';
import { AuthService } from '../auth.service';

const rpName = 'NEXUS AI Ecosystem';
const rpID = 'localhost';
const origin = `http://${rpID}:3000`; // Assuming frontend runs on 3000

@Injectable()
export class PasskeyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Passkey)
    private readonly passkeyRepository: Repository<Passkey>,
    private readonly redisService: RedisService,
    private readonly authService: AuthService
  ) {}

  private getChallengeKey(id: string): string {
    return `webauthn:challenge:${id}`;
  }

  async generateRegistrationOptions(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['passkeys'] });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userName: user.email,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map(key => ({
        id: key.credentialId,
        transports: key.transports as any,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    };

    const options = await generateRegistrationOptions(opts);
    
    // Store challenge in Redis with a 60s expiration
    await this.redisService.set(this.getChallengeKey(userId), options.challenge, 60);

    return options;
  }

  async verifyRegistrationResponse(userId: string, body: RegistrationResponseJSON) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const expectedChallenge = await this.redisService.get(this.getChallengeKey(userId));

    if (!user || !expectedChallenge) {
      throw new BadRequestException('User or challenge not found or expired');
    }

    let verification;
    try {
      const opts: VerifyRegistrationResponseOpts = {
        response: body,
        expectedChallenge: `${expectedChallenge}`,
        expectedOrigin: origin,
        expectedRPID: rpID,
      };
      verification = await verifyRegistrationResponse(opts);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const newPasskey = this.passkeyRepository.create({
        user,
        credentialId: registrationInfo.credential.id,
        publicKey: Buffer.from(registrationInfo.credential.publicKey).toString('base64url'),
        counter: registrationInfo.credential.counter,
        transports: registrationInfo.credential.transports,
      });

      await this.passkeyRepository.save(newPasskey);
      await this.redisService.del(this.getChallengeKey(userId));
      return { verified: true };
    }

    return { verified: false };
  }

  async generateAuthenticationOptions(email: string) {
    const user = await this.userRepository.findOne({ where: { email }, relations: ['passkeys'] });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const opts: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      allowCredentials: user.passkeys.map(key => ({
        id: key.credentialId,
        transports: key.transports as any,
      })),
      userVerification: 'preferred',
      rpID,
    };

    const options = await generateAuthenticationOptions(opts);
    // Store challenge in Redis mapped to user.id
    await this.redisService.set(this.getChallengeKey(user.id), options.challenge, 60);

    return options;
  }

  async verifyAuthenticationResponse(email: string, body: AuthenticationResponseJSON, deviceFingerprint?: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({ where: { email }, relations: ['passkeys'] });
    if (!user) throw new NotFoundException('User not found');
    
    const expectedChallenge = await this.redisService.get(this.getChallengeKey(user.id));
    if (!expectedChallenge) throw new BadRequestException('Challenge not found or expired');

    const passkey = user.passkeys.find(k => k.credentialId === body.id);
    if (!passkey) throw new BadRequestException('Passkey not found');

    let verification;
    try {
      const opts: VerifyAuthenticationResponseOpts = {
        response: body,
        expectedChallenge: `${expectedChallenge}`,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
          counter: passkey.counter,
          transports: passkey.transports as any,
        },
      };
      verification = await verifyAuthenticationResponse(opts);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    if (verification.verified) {
      passkey.counter = verification.authenticationInfo.newCounter;
      await this.passkeyRepository.save(passkey);
      await this.redisService.del(this.getChallengeKey(user.id));
      
      // Issue access and refresh tokens!
      return this.authService.generateTokenPair(user, ['user'], deviceFingerprint, ipAddress);
    }

    throw new BadRequestException('Passkey verification failed');
  }
}
