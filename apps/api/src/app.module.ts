import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from 'nestjs-zod';
import { createAuth } from './auth/auth.js';
import { InvitesController } from './auth/invites.controller.js';
import { InvitesService } from './auth/invites.service.js';
import { AccessLogInterceptor } from './common/access-log.interceptor.js';
import { ErrorEnvelopeFilter } from './common/error-envelope.filter.js';
import { requestIdMiddleware } from './common/request-id.middleware.js';
import { envFilePath, validateEnv, type Env } from './config/env.js';
import { EmailModule } from './email/email.module.js';
import { EmailService } from './email/email.service.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath, validate: validateEnv }),
    PrismaModule,
    EmailModule,
    // Mounts Better Auth at /api/auth/* and registers a global AuthGuard (opt out with @AllowAnonymous).
    AuthModule.forRootAsync({
      inject: [PrismaService, EmailService, ConfigService],
      useFactory: (prisma: PrismaService, email: EmailService, config: ConfigService<Env, true>) => ({
        auth: createAuth({
          prisma,
          email,
          env: {
            APP_URL: config.get('APP_URL', { infer: true }),
            BETTER_AUTH_SECRET: config.get('BETTER_AUTH_SECRET', { infer: true }),
            CORS_ORIGINS: config.get('CORS_ORIGINS', { infer: true }),
            NODE_ENV: config.get('NODE_ENV', { infer: true }),
          },
        }),
        bodyParser: { json: { limit: '1mb' }, urlencoded: { limit: '1mb', extended: false } },
      }),
    }),
    HealthModule,
  ],
  controllers: [InvitesController],
  providers: [
    InvitesService,
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
