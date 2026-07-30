import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // POS, mobil ilova, sayt va Mini App turli manzillardan keladi.
  app.enableCors({ origin: true, credentials: true });

  // Railway (va ko'p hosting) portni `PORT` orqali beradi — uni
  // hurmat qilmasak, konteyner ishga tushadi-yu, hech kim ulana olmaydi.
  // Lokalda esa `API_PORT` qulayroq.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);

  // Konteyner ichida `localhost` ga bog'lansak, tashqaridan ko'rinmaydi.
  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(`Imdod API ishga tushdi, port: ${port}`);
}

void bootstrap();
