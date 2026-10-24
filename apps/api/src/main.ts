import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // JSON lines in production so the log pipeline can parse them.
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });
  app.enableShutdownHooks();

  await app.listen(config.get('API_PORT', { infer: true }));
}
await bootstrap();
