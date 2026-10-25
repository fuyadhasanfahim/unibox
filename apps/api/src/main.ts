import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Better Auth reads the raw body itself; AuthModule re-adds JSON parsing for every other route.
    bodyParser: false,
    // JSON lines in production so the log pipeline can parse them.
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  const config = setupApp(app);

  await app.listen(config.get('API_PORT', { infer: true }));
}
await bootstrap();
