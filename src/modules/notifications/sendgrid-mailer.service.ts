import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import type { MailerPort, MailMessage } from './mailer.port';

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';

@Injectable()
export class SendgridMailerService implements MailerPort {
  private readonly logger = new Logger(SendgridMailerService.name);

  constructor(private readonly config: AppConfigService) {}

  async send(message: MailMessage): Promise<void> {
    const { sendgridApiKey, from } = this.config.email;

    if (!sendgridApiKey || !from) {
      this.logger.warn(
        'SENDGRID_API_KEY or EMAIL_FROM not set, skipping notification email',
      );
      return;
    }

    const response = await fetch(SENDGRID_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: message.to.map((email) => ({ email })) }],
        from: { email: from },
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          ...(message.html ? [{ type: 'text/html', value: message.html }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `SendGrid request failed (${response.status}): ${body}`,
      );
    }
  }
}
