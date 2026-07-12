import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Hybrid mode: subscribe the @EventPattern consumer (gdpr.user.deletion.requested)
  // so a deleted user's brand/campaign authorship is anonymised.
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      consumer: {
        groupId: 'branding-marketing-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(4121);
  console.log(`branding-marketing-service is running in hybrid mode on: ${await app.getUrl()}`);
}
bootstrap();
