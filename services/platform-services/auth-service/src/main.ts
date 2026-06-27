import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure hybrid application to listen to Kafka events
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      consumer: {
        groupId: 'auth-service-group',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(4100);
  console.log(`auth-service is running in hybrid mode on: ${await app.getUrl()}`);
}
bootstrap();
