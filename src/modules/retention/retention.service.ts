import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { and, eq, lt } from 'drizzle-orm';
import { resolveRetentionCutoff } from '../../common/retention-policy';
import { AppConfigService } from '../../config/app-config.service';
import { DRIZZLE } from '../../database/database.constants';
import type { DrizzleDatabase } from '../../database/database.provider';
import { events, issues, systems } from '../../database/schema';

const RETENTION_JOB_NAME = 'retention-sweep';

@Injectable()
export class RetentionService implements OnModuleInit {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    private readonly config: AppConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const job = new CronJob(this.config.retentionCron, () => {
      void this.sweep();
    });
    this.schedulerRegistry.addCronJob(RETENTION_JOB_NAME, job);
    job.start();
  }

  async sweep(): Promise<void> {
    const allSystems = await this.db.select().from(systems);

    for (const system of allSystems) {
      const cutoff = resolveRetentionCutoff(system.retentionPolicy);
      if (cutoff === null) {
        continue;
      }
      const cutoffDate = new Date(cutoff);

      const deletedEvents = await this.db
        .delete(events)
        .where(
          and(eq(events.systemId, system.id), lt(events.timestamp, cutoffDate)),
        )
        .returning({ id: events.id });

      const deletedIssues = await this.db
        .delete(issues)
        .where(
          and(eq(issues.systemId, system.id), lt(issues.lastSeen, cutoffDate)),
        )
        .returning({ id: issues.id });

      if (deletedEvents.length > 0 || deletedIssues.length > 0) {
        this.logger.log(
          `System "${system.slug}": purged ${deletedEvents.length} events and ${deletedIssues.length} issues older than ${system.retentionPolicy}`,
        );
      }
    }
  }
}
