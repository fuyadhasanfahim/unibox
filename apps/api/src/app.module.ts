import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AccessLogInterceptor } from './common/access-log.interceptor.js';
import { ErrorEnvelopeFilter } from './common/error-envelope.filter.js';
import { requestIdMiddleware } from './common/request-id.middleware.js';
import { envFilePath, validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath, validate: validateEnv }),
    PrismaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
    { provide: APP_INTERCEPTOR, useClass: AccessLogInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestIdMiddleware).forRoutes('*path');
  }
}
