import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { OAuthProfile } from '../entities/oauth-profile.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OAuthProfile)
    private readonly oauthProfileRepository: Repository<OAuthProfile>
  ) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { id, emails } = profile;
    const email = emails[0].value;

    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      user = this.userRepository.create({
        email,
        archetype: 'personal', // Default to personal, can be updated later
      });
      user = await this.userRepository.save(user);
    }

    let oauthProfile = await this.oauthProfileRepository.findOne({ where: { provider: 'google', providerId: id } });

    if (!oauthProfile) {
      oauthProfile = this.oauthProfileRepository.create({
        provider: 'google',
        providerId: id,
        user,
      });
      await this.oauthProfileRepository.save(oauthProfile);
    }

    done(null, user);
  }
}
