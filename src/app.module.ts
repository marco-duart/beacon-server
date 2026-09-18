import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { IssuesModule } from './modules/issues/issues.module';
import { KpisModule } from './modules/kpis/kpis.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RetentionModule } from './modules/retention/retention.module';
import { SystemsModule } from './modules/systems/systems.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    SystemsModule,
    EventsModule,
    IssuesModule,
    IngestionModule,
    RetentionModule,
    NotificationsModule,
    KpisModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
