import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants';
import type { DrizzleDatabase } from '../../database/database.provider';
import { events, issues, systems } from '../../database/schema';
import type { KpiOverviewResponseDto } from './kpis.dto';

const LOOKBACK_DAYS = 7;
const TOP_ERROR_TYPES_LIMIT = 10;

@Injectable()
export class KpisService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async overview(systemId?: number): Promise<KpiOverviewResponseDto> {
    const issueScope =
      systemId !== undefined ? eq(issues.systemId, systemId) : undefined;
    const eventScope =
      systemId !== undefined ? eq(events.systemId, systemId) : undefined;

    const [
      totalSystems,
      statusCounts,
      eventsLast7Days,
      topErrorTypes,
      issuesBySystem,
    ] = await Promise.all([
      systemId !== undefined ? Promise.resolve(1) : this.countSystems(),
      this.countIssuesByStatus(issueScope),
      this.eventsPerDay(eventScope),
      this.topErrorTypes(issueScope),
      systemId !== undefined ? Promise.resolve([]) : this.issuesBySystem(),
    ]);

    return {
      totalSystems,
      totalIssues:
        statusCounts.open + statusCounts.resolved + statusCounts.ignored,
      openIssues: statusCounts.open,
      resolvedIssues: statusCounts.resolved,
      ignoredIssues: statusCounts.ignored,
      eventsLast7Days,
      topErrorTypes,
      issuesBySystem,
    };
  }

  private async countSystems(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(systems);
    return row?.value ?? 0;
  }

  private async countIssuesByStatus(
    scope: ReturnType<typeof eq> | undefined,
  ): Promise<{ open: number; resolved: number; ignored: number }> {
    const rows = await this.db
      .select({ status: issues.status, value: count() })
      .from(issues)
      .where(scope)
      .groupBy(issues.status);

    const result = { open: 0, resolved: 0, ignored: 0 };
    for (const row of rows) {
      result[row.status] = row.value;
    }
    return result;
  }

  private async eventsPerDay(scope: ReturnType<typeof eq> | undefined) {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const dateExpr = sql<string>`strftime('%Y-%m-%d', ${events.timestamp} / 1000, 'unixepoch')`;

    const rows = await this.db
      .select({ date: dateExpr, value: count() })
      .from(events)
      .where(
        scope
          ? and(scope, gte(events.timestamp, since))
          : gte(events.timestamp, since),
      )
      .groupBy(dateExpr)
      .orderBy(dateExpr);

    return rows.map((row) => ({ date: row.date, count: row.value }));
  }

  private async topErrorTypes(scope: ReturnType<typeof eq> | undefined) {
    const rows = await this.db
      .select({ type: issues.type, value: count() })
      .from(issues)
      .where(scope)
      .groupBy(issues.type)
      .orderBy(desc(count()))
      .limit(TOP_ERROR_TYPES_LIMIT);

    return rows.map((row) => ({ type: row.type, count: row.value }));
  }

  private async issuesBySystem() {
    const rows = await this.db
      .select({
        systemId: systems.id,
        systemName: systems.name,
        totalCount: count(issues.id),
        openCount: sql<number>`sum(case when ${issues.status} = 'open' then 1 else 0 end)`,
      })
      .from(systems)
      .leftJoin(issues, eq(issues.systemId, systems.id))
      .groupBy(systems.id)
      .orderBy(desc(count(issues.id)));

    return rows.map((row) => ({
      systemId: row.systemId,
      systemName: row.systemName,
      totalCount: row.totalCount,
      openCount: Number(row.openCount ?? 0),
    }));
  }
}
