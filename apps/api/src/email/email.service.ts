import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Env } from '../config/env.js';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Link to log in dev when no Resend key is configured. Never logged in production. */
  devLink?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly isProd: boolean;
  private readonly mailpitUrl?: string;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('RESEND_API_KEY', { infer: true });
    this.resend = key ? new Resend(key) : null;
    this.from = config.get('EMAIL_FROM', { infer: true });
    this.isProd = config.get('NODE_ENV', { infer: true }) === 'production';
    this.mailpitUrl = config.get('MAILPIT_URL', { infer: true });
  }

  async send(message: EmailMessage): Promise<void> {
    if (this.mailpitUrl) return this.sendToMailpit(this.mailpitUrl, message);

    if (!this.resend) {
      // Env validation makes this branch unreachable in production.
      if (this.isProd) throw new Error('Email provider is not configured');
      this.logger.warn(`[dev email] "${message.subject}" → ${message.to}${message.devLink ? `\n  ${message.devLink}` : ''}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      // Provider error names only; the payload can contain the recipient and tokenised links.
      this.logger.error(`Email send failed: ${error.name}`);
      throw new Error('Email could not be sent');
    }
  }

  // Mailpit's HTTP send API: no SMTP client needed. Open the Mailpit UI to read the message.
  private async sendToMailpit(baseUrl: string, message: EmailMessage): Promise<void> {
    const match = /^(?:(.*) )?<(.+)>$/.exec(this.from);
    const res = await fetch(new URL('/api/v1/send', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        From: { Email: match?.[2] ?? this.from, Name: match?.[1] ?? '' },
        To: [{ Email: message.to }],
        Subject: message.subject,
        HTML: message.html,
        Text: message.text,
      }),
    });
    if (!res.ok) {
      this.logger.error(`Mailpit rejected the message (${res.status}). Is it running?`);
      throw new Error('Email could not be sent');
    }
  }
}
