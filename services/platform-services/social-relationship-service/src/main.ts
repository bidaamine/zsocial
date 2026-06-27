import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(4106);
  console.log(`social-relationship-service is running on: ${await app.getUrl()}`);
}
bootstrap();
