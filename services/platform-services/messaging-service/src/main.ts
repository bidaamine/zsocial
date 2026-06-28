import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 4113;
  await app.listen(port);
  console.log(`messaging-service is running on: ${await app.getUrl()}`);
}
bootstrap();
