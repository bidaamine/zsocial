import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any) {
    // User is populated by GoogleStrategy
    const user: User = req.user;
    
    // Generate our internal RS256 JWT and Refresh Token pair
    return this.authService.generateTokenPair(user, ['user']);
  }
}
