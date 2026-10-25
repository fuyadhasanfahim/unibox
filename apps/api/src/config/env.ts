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
    // Proves a request came through our web proxy, so its client-IP header can be trusted.
    INTERNAL_PROXY_SECRET: z.string().min(32, 'must be at least 32 characters'),
    RESEND_API_KEY: optional(z.string().startsWith('re_', 'must be a Resend key (re_...)')),
    EMAIL_FROM: z.string().min(3).default('Unibox <onboarding@resend.dev>'),
    // Dev inbox (Mailpit). Takes priority over Resend so dev mail never reaches real addresses.
    MAILPIT_URL: optional(z.url()),
    // Channel token encryption keys, "version:base64(32 bytes)", comma-separated. The FIRST key encrypts new
    // tokens; older ones stay listed so existing tokens still decrypt until they are re-encrypted.
    TOKEN_ENCRYPTION_KEYS: z.string().min(1).transform((v, ctx) => {
      const keys = new Map<string, Buffer>();
      for (const entry of v.split(',')) {
        const [version, b64, ...rest] = entry.trim().split(':');
        const key = b64 ? Buffer.from(b64, 'base64') : undefined;
        if (!version || rest.length || key?.length !== 32 || keys.has(version)) {
          ctx.addIssue({ code: 'custom', message: 'must be "version:base64(32 bytes)" entries with unique versions' });
          return z.NEVER;
        }
        keys.set(version, key);
      }
      return { current: keys.keys().next().value as string, keys };
    }),
    // Meta app. Optional in dev until the app exists; channels stay disabled without them.
    META_APP_ID: optional(z.string().regex(/^\d+$/, 'must be a numeric Meta app id')),
    META_APP_SECRET: optional(z.string().min(16)),
    META_WEBHOOK_VERIFY_TOKEN: optional(z.string().min(16)),
    // Instagram API with Instagram login uses its own app id and secret (shown under the Instagram use case).
    INSTAGRAM_APP_ID: optional(z.string().regex(/^\d+$/, 'must be a numeric Instagram app id')),
    INSTAGRAM_APP_SECRET: optional(z.string().min(16)),
    // Pinned Graph API version; bump deliberately after reading Meta's changelog.
    META_GRAPH_VERSION: z.string().regex(/^v\d+\.\d+$/, 'must look like v26.0').default('v26.0'),
  })
  .superRefine((env, ctx) => {
    // Dev may log email links instead of sending; production must really send them.
    if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'is required in production' });
    }
    const meta = [env.META_APP_ID, env.META_APP_SECRET, env.META_WEBHOOK_VERIFY_TOKEN];
    // All three or none: a half-configured Meta app would fail at the first webhook instead of at boot.
    if (meta.some(Boolean) && !meta.every(Boolean)) {
      ctx.addIssue({ code: 'custom', path: ['META_APP_ID'], message: 'META_APP_ID, META_APP_SECRET and META_WEBHOOK_VERIFY_TOKEN must be set together' });
    }
    if (Boolean(env.INSTAGRAM_APP_ID) !== Boolean(env.INSTAGRAM_APP_SECRET)) {
      ctx.addIssue({ code: 'custom', path: ['INSTAGRAM_APP_ID'], message: 'INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET must be set together' });
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
