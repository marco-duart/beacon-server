import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';
import { ConsoleMailerService } from './console-mailer.service';
import { MAILER_PORT } from './mailer.port';
import { NotificationsService } from './notifications.service';
import { SendgridMailerService } from './sendgrid-mailer.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    SendgridMailerService,
    ConsoleMailerService,
    {
      provide: MAILER_PORT,
      inject: [AppConfigService, SendgridMailerService, ConsoleMailerService],
      useFactory: (
        config: AppConfigService,
        sendgrid: SendgridMailerService,
        fallback: ConsoleMailerService,
      ) => (config.email.provider === 'sendgrid' ? sendgrid : fallback),
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
