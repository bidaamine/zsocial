import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { MfaConfig } from '../entities/mfa-config.entity';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, MfaConfig])],
  controllers: [MfaController],
  providers: [MfaService],
  exports: [MfaService],
})
export class MfaModule {}
