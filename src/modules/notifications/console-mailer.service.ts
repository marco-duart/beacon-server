import { Injectable, Logger } from '@nestjs/common';
import type { MailerPort, MailMessage } from './mailer.port';

@Injectable()
export class ConsoleMailerService implements MailerPort {
  private readonly logger = new Logger('Notifications');

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `[email not sent, no provider configured] to=${message.to.join(', ')} subject="${message.subject}"`,
    );
    return Promise.resolve();
  }
}
