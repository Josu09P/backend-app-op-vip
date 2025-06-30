import * as crypto from 'crypto';
(global as any).crypto = crypto;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Configurar CORS
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Configurar límites de tamaño de request
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: true,
      },
    })
  );

  // Middleware CORS extra (opcional)
  app.use(cors());

  // Escuchar en el puerto de entorno o 3001 por defecto
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
