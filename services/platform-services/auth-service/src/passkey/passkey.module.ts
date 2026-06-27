import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Passkey } from '../entities/passkey.entity';
import { PasskeyService } from './passkey.service';
import { PasskeyController } from './passkey.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Passkey])],
  controllers: [PasskeyController],
  providers: [PasskeyService],
  exports: [PasskeyService],
})
export class PasskeyModule {}
