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

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`Imdod API ishga tushdi: http://localhost:${port}`);
}

void bootstrap();
