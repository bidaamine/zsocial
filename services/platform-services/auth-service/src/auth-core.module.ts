import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt/jwt.strategy';
import { KafkaService } from './kafka/kafka.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, RefreshToken]),
  ],
  providers: [AuthService, JwtStrategy, KafkaService],
  exports: [AuthService, PassportModule, TypeOrmModule, KafkaService],
})
export class AuthCoreModule {}
