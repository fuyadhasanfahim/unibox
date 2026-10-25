import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { clientIpMiddleware } from './common/client-ip.middleware.js';
import type { Env } from './config/env.js';

// Shared by main.ts and e2e tests so tests hit the same prefix, headers and CORS as production.
export function setupApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Registered before init, so it runs ahead of Better Auth's handler and every route.
  app.use(clientIpMiddleware(config.get('INTERNAL_PROXY_SECRET', { infer: true })));
  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
  app.enableShutdownHooks();

  return config;
}
