import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { AppConfigService } from '../../config/app-config.service';
import { DRIZZLE } from '../../database/database.constants';
import type { DrizzleDatabase } from '../../database/database.provider';
import { eventQueue, type QueueItem } from '../../database/schema';
import { EventsService } from '../events/events.service';
import { IssuesService } from '../issues/issues.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SystemsService } from '../systems/systems.service';
import { computeFingerprint } from './fingerprint.util';
import type { IngestEventDto } from './ingestion.dto';

const MAX_ATTEMPTS = 5;

@Injectable()
export class QueueWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorkerService.name);
  private timer: NodeJS.Timeout | undefined;
  private stopped = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    private readonly config: AppConfigService,
    private readonly issuesService: IssuesService,
    private readonly eventsService: EventsService,
    private readonly systemsService: SystemsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.scheduleNextTick(0);
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private scheduleNextTick(delayMs: number): void {
    if (this.stopped) {
      return;
    }
    this.timer = setTimeout(() => {
      void this.runBatch();
    }, delayMs);
  }

  private async runBatch(): Promise<void> {
    const { pollIntervalMs, batchSize } = this.config.queue;

    try {
      const pending = await this.db
        .select()
        .from(eventQueue)
        .where(eq(eventQueue.status, 'pending'))
        .orderBy(asc(eventQueue.id))
        .limit(batchSize);

      for (const item of pending) {
        await this.processItem(item);
      }
    } catch (error) {
      this.logger.error('Queue batch processing failed', error);
    } finally {
      this.scheduleNextTick(pollIntervalMs);
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    try {
      const payload = JSON.parse(item.payload) as IngestEventDto;
      const occurredAt = payload.timestamp
        ? new Date(payload.timestamp)
        : item.createdAt;
      const fingerprint = computeFingerprint(
        payload.type,
        payload.message,
        payload.stacktrace,
      );

      const { issue, isNew } = this.issuesService.upsertFromEvent({
        systemId: item.systemId,
        fingerprint,
        type: payload.type,
        message: payload.message,
        level: payload.level,
        environment: payload.environment,
        release: payload.release,
        occurredAt,
      });

      await this.eventsService.create({
        issueId: issue.id,
        systemId: item.systemId,
        message: payload.message,
        stacktrace:
          payload.stacktrace !== undefined
            ? JSON.stringify(payload.stacktrace)
            : null,
        environment: payload.environment ?? null,
        release: payload.release ?? null,
        tags: payload.tags !== undefined ? JSON.stringify(payload.tags) : null,
        extra:
          payload.extra !== undefined ? JSON.stringify(payload.extra) : null,
        timestamp: occurredAt,
      });

      await this.db.delete(eventQueue).where(eq(eventQueue.id, item.id));

      if (isNew) {
        const system = await this.systemsService.findOne(item.systemId);
        await this.notificationsService.notifyNewIssue(system, issue);
      }
    } catch (error) {
      await this.markFailedAttempt(item, error);
    }
  }

  private async markFailedAttempt(
    item: QueueItem,
    error: unknown,
  ): Promise<void> {
    const attempts = item.attempts + 1;
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Failed to process queue item ${item.id} (attempt ${attempts}): ${message}`,
    );

    await this.db
      .update(eventQueue)
      .set({
        attempts,
        error: message,
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      })
      .where(eq(eventQueue.id, item.id));
  }
}
