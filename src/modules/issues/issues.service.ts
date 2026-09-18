import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { paginationOffset, type Paginated } from '../../common/pagination.dto';
import { DRIZZLE } from '../../database/database.constants';
import type { DrizzleDatabase } from '../../database/database.provider';
import {
  issues,
  type Issue,
  type IssueLevel,
  type IssueStatus,
} from '../../database/schema';

export interface UpsertIssueInput {
  systemId: number;
  fingerprint: string;
  type: string;
  message: string;
  level: IssueLevel;
  environment?: string;
  release?: string;
  occurredAt: Date;
}

export interface UpsertIssueResult {
  issue: Issue;
  isNew: boolean;
}

export interface FindIssuesFilter {
  systemId?: number;
  status?: IssueStatus;
  level?: IssueLevel;
  page: number;
  pageSize: number;
}

@Injectable()
export class IssuesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  upsertFromEvent(input: UpsertIssueInput): UpsertIssueResult {
    return this.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(issues)
        .where(
          and(
            eq(issues.systemId, input.systemId),
            eq(issues.fingerprint, input.fingerprint),
          ),
        )
        .get();

      if (!existing) {
        const created = tx
          .insert(issues)
          .values({
            systemId: input.systemId,
            fingerprint: input.fingerprint,
            type: input.type,
            message: input.message,
            level: input.level,
            environment: input.environment,
            release: input.release,
            status: 'open',
            count: 1,
            firstSeen: input.occurredAt,
            lastSeen: input.occurredAt,
          })
          .returning()
          .get();
        return { issue: created, isNew: true };
      }

      const lastSeen =
        input.occurredAt > existing.lastSeen
          ? input.occurredAt
          : existing.lastSeen;
      const updated = tx
        .update(issues)
        .set({
          count: existing.count + 1,
          lastSeen,
          status: existing.status === 'resolved' ? 'open' : existing.status,
          message: input.message,
        })
        .where(eq(issues.id, existing.id))
        .returning()
        .get();

      return { issue: updated, isNew: false };
    });
  }

  async findAll(filter: FindIssuesFilter): Promise<Paginated<Issue>> {
    const conditions = [
      filter.systemId !== undefined
        ? eq(issues.systemId, filter.systemId)
        : undefined,
      filter.status !== undefined
        ? eq(issues.status, filter.status)
        : undefined,
      filter.level !== undefined ? eq(issues.level, filter.level) : undefined,
    ].filter(
      (condition): condition is NonNullable<typeof condition> =>
        condition !== undefined,
    );
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(issues)
        .where(where)
        .orderBy(desc(issues.lastSeen))
        .limit(filter.pageSize)
        .offset(paginationOffset(filter)),
      this.db.select({ total: count() }).from(issues).where(where),
    ]);

    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }

  async findOne(id: number): Promise<Issue> {
    const [issue] = await this.db
      .select()
      .from(issues)
      .where(eq(issues.id, id))
      .limit(1);
    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`);
    }
    return issue;
  }

  async updateStatus(id: number, status: IssueStatus): Promise<Issue> {
    await this.findOne(id);
    const [issue] = await this.db
      .update(issues)
      .set({ status })
      .where(eq(issues.id, id))
      .returning();
    return issue;
  }
}
