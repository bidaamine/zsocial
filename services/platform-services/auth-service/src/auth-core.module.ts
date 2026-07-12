import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt/jwt.strategy';
import { KafkaService } from './kafka/kafka.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserDevice } from './entities/user-device.entity';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // UserDevice is required: AuthService injects UserDeviceRepository. Without it here
    // the module-scoped repo provider is missing and AuthService fails to instantiate.
    TypeOrmModule.forFeature([User, RefreshToken, UserDevice]),
  ],
  providers: [AuthService, JwtStrategy, KafkaService],
  exports: [AuthService, PassportModule, TypeOrmModule, KafkaService],
})
export class AuthCoreModule {}
