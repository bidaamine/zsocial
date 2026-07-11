import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Hybrid mode: subscribe the @EventPattern consumer
  // (gdpr.user.deletion.requested) so the content GDPR cascade actually runs.
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      consumer: {
        groupId: 'content-service-group',
      },
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT || 4112;
  await app.listen(port);
  console.log(`content-service is running in hybrid mode on: ${await app.getUrl()}`);
}
bootstrap();
