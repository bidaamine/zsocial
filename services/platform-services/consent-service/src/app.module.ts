import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { ConsentEnforcementGuard } from './consent-enforcement.guard';
import { PostgresModule } from '@nexus/core-infra';

@Module({
  imports: [
    PostgresModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'nexus',
      password: 'password',
      database: 'nexus_db',
      autoLoadEntities: true,
      synchronize: true, // Only for dev
    })
  ],
  controllers: [ConsentController],
  providers: [
    ConsentService,
    ConsentEnforcementGuard,
  ],
  exports: [ConsentEnforcementGuard],
})
export class AppModule {}
