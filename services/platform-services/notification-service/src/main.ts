import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(4105);
  console.log(`notification-service is running on: ${await app.getUrl()}`);
}
bootstrap();
