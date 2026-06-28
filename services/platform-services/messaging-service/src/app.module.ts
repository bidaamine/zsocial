import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { Message } from './entities/message.entity';
import { MessageDraft } from './entities/message-draft.entity';
import { ZeroTrustGuard } from './zero-trust.guard';
import { PostgresModule } from '@nexus/core-infra';

@Module({
  imports: [
    PostgresModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'nexus',
      password: 'password',
      database: 'nexus_db',
      autoLoadEntities: true,
      synchronize: true, // Dev-only
    }),
    TypeOrmModule.forFeature([Message, MessageDraft]),
  ],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    ZeroTrustGuard,
  ],
})
export class AppModule {}
