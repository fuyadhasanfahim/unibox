import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { organization } from 'better-auth/plugins';
import { CLIENT_IP_HEADER } from '../common/client-ip.middleware.js';
import type { Env } from '../config/env.js';
import type { EmailService } from '../email/email.service.js';
import { resetPasswordEmail } from '../email/templates.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword, verifyPassword } from './password.js';

export const INVITATION_TTL_SECONDS = 48 * 60 * 60;
const RESET_TTL_SECONDS = 30 * 60;

// Read-only organization endpoints stay open (they check membership themselves).
// Every mutation (invite, role change, remove, create, delete, accept) goes through our own
// guarded /api/v1 endpoints, which enforce the role-rank and last-owner rules and write audit logs.
const ALLOWED_ORGANIZATION_PATHS = new Set([
  '/organization/list',
  '/organization/get-full-organization',
  '/organization/set-active',
  '/organization/get-active-member',
]);

type Deps = {
  prisma: PrismaService;
  email: EmailService;
  env: Pick<Env, 'APP_URL' | 'BETTER_AUTH_SECRET' | 'CORS_ORIGINS' | 'NODE_ENV'>;
};

export function createAuth({ prisma, email, env }: Deps) {
  return betterAuth({
    appName: 'Unibox',
    // Served behind the web app's /api proxy: links and cookies use the public origin.
    baseURL: env.APP_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.CORS_ORIGINS,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),

    emailAndPassword: {
      enabled: true,
      // Invite-only: accounts are created by POST /api/v1/invites/accept, never by public sign-up.
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      password: { hash: hashPassword, verify: verifyPassword },
      resetPasswordTokenExpiresIn: RESET_TTL_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
        await email.send({ to: user.email, ...resetPasswordEmail({ url, name: user.name }), devLink: url });
      },
    },

    user: {
      additionalFields: {
        // Platform role. input:false = clients can never set it, only server code/seed.
        role: { type: 'string', required: false, defaultValue: 'user', input: false },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh expiry at most once a day
    },

    advanced: {
      cookiePrefix: 'unibox',
      useSecureCookies: env.NODE_ENV === 'production',
      // Only the header our web proxy sets (and the API verifies with a shared secret).
      // x-forwarded-for is never trusted: clients can write it themselves.
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },

    // Stored in Postgres so limits hold across API instances and restarts.
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rateLimit',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 300, max: 3 },
        '/reset-password': { window: 60, max: 5 },
      },
    },

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path.startsWith('/organization/') && !ALLOWED_ORGANIZATION_PATHS.has(ctx.path)) {
          throw new APIError('FORBIDDEN', { message: 'Use the workspace API for this action.' });
        }
      }),
    },

    plugins: [
      organization({
        allowUserToCreateOrganization: false, // tenants are created by platform admins
        invitationExpiresIn: INVITATION_TTL_SECONDS,
        schema: {
          organization: {
            additionalFields: {
              status: { type: 'string', required: false, defaultValue: 'pending', input: false },
            },
          },
          invitation: {
            additionalFields: {
              // SHA-256 of our single-use email token; never returned to clients.
              tokenHash: { type: 'string', required: false, input: false, returned: false },
            },
          },
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
