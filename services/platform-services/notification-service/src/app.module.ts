import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';
import { Notification } from './entities/notification.entity';
import { PostgresModule, KafkaModule } from '@nexus/core-infra';

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
    TypeOrmModule.forFeature([Notification]),
    KafkaModule.registerClient('NOTIFICATION_CLIENT', ['localhost:9092'], 'notification-service')
  ],
  controllers: [NotificationController],
  providers: [
    NotificationDispatcherService,
    EmailProvider,
    PushProvider,
    SmsProvider,
  ],
})
export class AppModule {}
