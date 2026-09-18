import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Issue, System, User } from '../../database/schema';
import { MAILER_PORT, type MailerPort } from './mailer.port';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(MAILER_PORT) private readonly mailer: MailerPort) {}

  async notifyNewIssue(system: System, issue: Issue): Promise<void> {
    const recipients = parseRecipients(system.notifyEmails);
    if (recipients.length === 0) {
      return;
    }

    try {
      await this.mailer.send({
        to: recipients,
        subject: `[Beacon] New issue in ${system.name}: ${issue.type}`,
        text: [
          `A new issue was just reported for "${system.name}".`,
          '',
          `Type: ${issue.type}`,
          `Message: ${issue.message}`,
          `Level: ${issue.level}`,
          issue.environment ? `Environment: ${issue.environment}` : undefined,
          issue.release ? `Release: ${issue.release}` : undefined,
          `First seen: ${issue.firstSeen.toISOString()}`,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send new-issue notification for issue ${issue.id}`,
        error,
      );
    }
  }

  async notifyUserCredentials(
    user: User,
    plainPassword: string,
    context: 'created' | 'password-reset',
  ): Promise<void> {
    const subject =
      context === 'created'
        ? '[Beacon] Your dashboard account was created'
        : '[Beacon] Your password was reset';

    try {
      await this.mailer.send({
        to: [user.email],
        subject,
        text: [
          context === 'created'
            ? `An account was created for you on Beacon with the role "${user.role}".`
            : 'Your Beacon password was reset.',
          '',
          `E-mail: ${user.email}`,
          `Temporary password: ${plainPassword}`,
          '',
          'This password is shown only in this e-mail — keep it safe.',
        ].join('\n'),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send credentials e-mail to user ${user.id}`,
        error,
      );
    }
  }
}

function parseRecipients(notifyEmails: string | null): string[] {
  if (!notifyEmails) {
    return [];
  }
  return notifyEmails
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}
