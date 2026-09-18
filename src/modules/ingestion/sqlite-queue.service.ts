import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.constants';
import type { DrizzleDatabase } from '../../database/database.provider';
import { eventQueue } from '../../database/schema';
import type { IngestEventDto } from './ingestion.dto';
import type { QueuePort } from './queue.port';

@Injectable()
export class SqliteQueueService implements QueuePort {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async enqueue(systemId: number, payload: IngestEventDto): Promise<void> {
    await this.db.insert(eventQueue).values({
      systemId,
      payload: JSON.stringify(payload),
      status: 'pending',
    });
  }
}
