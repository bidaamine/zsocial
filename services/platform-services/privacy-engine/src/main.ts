import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(5100);
  console.log(`privacy-engine is running on: ${await app.getUrl()}`);
}
bootstrap();
