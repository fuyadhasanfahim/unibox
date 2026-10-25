import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const origin = z
  .url()
  .refine((v) => URL.canParse(v) && new URL(v).origin === v, 'must be an origin without path or trailing slash');

// Empty strings in .env mean "not set".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    // Trusted browser origins, comma-separated. Wildcards are rejected on purpose (credentials are sent).
    CORS_ORIGINS: z
      .string()
      .min(1)
      .transform((v) => v.split(',').map((s) => s.trim()))
      .pipe(z.array(origin).min(1)),
    // Public web origin. Auth runs behind the web app's /api proxy so cookies stay first-party.
    APP_URL: origin,
    BETTER_AUTH_SECRET: z.string().min(32, 'must be at least 32 characters'),
    RESEND_API_KEY: optional(z.string().startsWith('re_', 'must be a Resend key (re_...)')),
    EMAIL_FROM: z.string().min(3).default('Unibox <onboarding@resend.dev>'),
    // Dev inbox (Mailpit). Takes priority over Resend so dev mail never reaches real addresses.
    MAILPIT_URL: optional(z.url()),
  })
  .superRefine((env, ctx) => {
    // Dev may log email links instead of sending; production must really send them.
    if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'is required in production' });
    }
    if (env.NODE_ENV === 'production' && env.MAILPIT_URL) {
      ctx.addIssue({ code: 'custom', path: ['MAILPIT_URL'], message: 'must not be set in production' });
    }
  });

export type Env = z.infer<typeof envSchema>;

// Repo root .env, shared with docker-compose. Missing file is fine (prod uses real env vars).
export const envFilePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.env');

// Fail fast on boot. Only key names and messages are reported, never values (they can be secrets).
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}
