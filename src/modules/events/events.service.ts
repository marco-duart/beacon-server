import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants';
import type { DrizzleDatabase } from '../../database/database.provider';
import { events, type Event, type NewEvent } from '../../database/schema';

@Injectable()
export class EventsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async create(event: NewEvent): Promise<Event> {
    const [created] = await this.db.insert(events).values(event).returning();
    return created;
  }

  async findByIssue(issueId: number, limit = 50): Promise<Event[]> {
    return this.db
      .select()
      .from(events)
      .where(eq(events.issueId, issueId))
      .orderBy(desc(events.timestamp))
      .limit(limit);
  }
}
