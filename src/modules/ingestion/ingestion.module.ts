import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { IssuesModule } from '../issues/issues.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemsModule } from '../systems/systems.module';
import { ApiKeyGuard } from './api-key.guard';
import { IngestionController } from './ingestion.controller';
import { QueueWorkerService } from './queue-worker.service';
import { SqliteQueueService } from './sqlite-queue.service';

@Module({
  imports: [SystemsModule, IssuesModule, EventsModule, NotificationsModule],
  controllers: [IngestionController],
  providers: [SqliteQueueService, QueueWorkerService, ApiKeyGuard],
})
export class IngestionModule {}
