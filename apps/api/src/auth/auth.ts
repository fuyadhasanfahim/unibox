import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import type { Env } from '../config/env.js';
import type { EmailService } from '../email/email.service.js';
import { invitationEmail, resetPasswordEmail } from '../email/templates.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword, verifyPassword } from './password.js';
import { createToken } from './tokens.js';

export const INVITATION_TTL_SECONDS = 48 * 60 * 60;
const RESET_TTL_SECONDS = 30 * 60;

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
    },

    // ponytail: in-memory limiter is per API instance; switch storage to "database"/Redis when scaling out.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 300, max: 3 },
        '/reset-password': { window: 60, max: 5 },
      },
    },

    plugins: [
      organization({
        allowUserToCreateOrganization: false, // tenants are created by platform admins
        invitationExpiresIn: INVITATION_TTL_SECONDS,
        cancelPendingInvitationsOnReInvite: true,
        schema: {
          organization: {
            additionalFields: {
              status: { type: 'string', required: false, defaultValue: 'pending', input: false },
            },
          },
          invitation: {
            additionalFields: {
              tokenHash: { type: 'string', required: false, input: false, returned: false },
            },
          },
        },
        // Better Auth's invitation id is stored in plain text, so the email carries our own
        // single-use token instead and only its hash is persisted.
        sendInvitationEmail: async ({ id, email: to, role, organization: org, inviter }) => {
          const token = createToken();
          await prisma.invitation.update({ where: { id }, data: { tokenHash: token.hash } });
          const url = `${env.APP_URL}/sign-up?invitation_token=${token.raw}`;
          await email.send({
            to,
            ...invitationEmail({ url, organizationName: org.name, inviterName: inviter.user.name, role }),
            devLink: url,
          });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
