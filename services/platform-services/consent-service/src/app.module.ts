import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentController } from './consent.controller';
import { ConsentKafkaController } from './consent-kafka.controller';
import { ConsentService } from './consent.service';
import { ConsentEnforcementGuard } from './consent-enforcement.guard';
import { ConsentRecord } from './entities/consent-record.entity';
import { PostgresModule, RedisModule } from '@nexus/core-infra';

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
      synchronize: true, // Only for dev
    }),
    TypeOrmModule.forFeature([ConsentRecord]),
    RedisModule.forRoot({ host: 'localhost', port: 6379 })
  ],
  controllers: [ConsentController, ConsentKafkaController],
  providers: [
    ConsentService,
    ConsentEnforcementGuard,
  ],
  exports: [ConsentEnforcementGuard, ConsentService],
})
export class AppModule {}
