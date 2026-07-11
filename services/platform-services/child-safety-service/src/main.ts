import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Hybrid mode: subscribe the @EventPattern consumer
  // (gdpr.user.deletion.requested) so the child-data GDPR cascade actually runs.
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      consumer: {
        groupId: 'child-safety-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(4102);
  console.log(`child-safety-service is running in hybrid mode on: ${await app.getUrl()}`);
}
bootstrap();
