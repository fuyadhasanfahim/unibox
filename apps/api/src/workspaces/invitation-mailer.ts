import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { EmailService } from '../email/email.service.js';
import { addedToWorkspaceEmail, invitationEmail } from '../email/templates.js';

// Sends after the database commit. A failed send never rolls back the invitation: the caller
// reports `emailSent: false` and the inviter can resend (re-inviting replaces the token).
@Injectable()
export class InvitationMailer {
  private readonly logger = new Logger(InvitationMailer.name);
  private readonly appUrl: string;

  constructor(
    private readonly email: EmailService,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true });
  }

  async sendInvite(p: { to: string; rawToken: string; organizationName: string; inviterName: string; role: string }) {
    const url = `${this.appUrl}/sign-up?invitation_token=${p.rawToken}`;
    return this.trySend(() =>
      this.email.send({ to: p.to, ...invitationEmail({ url, organizationName: p.organizationName, inviterName: p.inviterName, role: p.role }), devLink: url }),
    );
  }

  async sendAdded(p: { to: string; organizationName: string; role: string }) {
    const url = `${this.appUrl}/sign-in`;
    return this.trySend(() => this.email.send({ to: p.to, ...addedToWorkspaceEmail({ url, organizationName: p.organizationName, role: p.role }) }));
  }

  private async trySend(send: () => Promise<void>): Promise<boolean> {
    try {
      await send();
      return true;
    } catch {
      this.logger.warn('Invitation email could not be sent');
      return false;
    }
  }
}
