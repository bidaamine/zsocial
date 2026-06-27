import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(4108);
  console.log(`audit-compliance-service is running on: ${await app.getUrl()}`);
}
bootstrap();
