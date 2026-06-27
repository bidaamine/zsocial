import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { UserConnection } from './entities/user-connection.entity';
import { ZeroTrustGuard } from './zero-trust.guard';
import { PostgresModule, KafkaModule, Neo4jModule } from '@nexus/core-infra';

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
    TypeOrmModule.forFeature([UserConnection]),
    Neo4jModule.forRoot({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
    }),
    KafkaModule.registerClient('SOCIAL_CLIENT', ['localhost:9092'], 'social-relationship-service')
  ],
  controllers: [SocialController],
  providers: [
    SocialService,
    ZeroTrustGuard,
  ],
})
export class AppModule {}
