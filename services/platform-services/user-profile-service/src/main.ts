import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Hybrid mode: subscribe the @EventPattern consumers (auth.user.registered,
  // gdpr.user.deletion.requested) to the Kafka broker. Without this the
  // profile-seeding and GDPR-cascade handlers never fire.
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      consumer: {
        groupId: 'user-profile-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(4103);
  console.log(`user-profile-service is running in hybrid mode on: ${await app.getUrl()}`);
}
bootstrap();
