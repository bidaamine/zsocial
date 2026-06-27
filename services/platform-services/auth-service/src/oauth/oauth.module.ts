import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { OAuthProfile } from '../entities/oauth-profile.entity';
import { GoogleStrategy } from './google.strategy';
import { OAuthController } from './oauth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, OAuthProfile])],
  controllers: [OAuthController],
  providers: [GoogleStrategy],
  exports: [GoogleStrategy],
})
export class OAuthModule {}
