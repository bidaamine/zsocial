import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Consistent with every other service: routes are served under /api (so the gateway
  // reaches them at /api/media/*, matching /api/route/media/api/media/...).
  app.setGlobalPrefix('api');

  // Hybrid mode: subscribe the @EventPattern consumer (gdpr.user.deletion.requested)
  // so a user's media is purged from S3 and the DB on account deletion.
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      consumer: {
        groupId: 'media-file-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(4107);
  console.log(`media-file-service is running in hybrid mode on: ${await app.getUrl()}`);
}
bootstrap();
