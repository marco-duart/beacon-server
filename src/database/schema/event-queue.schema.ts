import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { systems } from './systems.schema';

export const QUEUE_ITEM_STATUSES = [
  'pending',
  'processing',
  'done',
  'failed',
] as const;
export type QueueItemStatus = (typeof QUEUE_ITEM_STATUSES)[number];

export const eventQueue = sqliteTable(
  'event_queue',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    systemId: integer('system_id')
      .notNull()
      .references(() => systems.id, { onDelete: 'cascade' }),
    payload: text('payload').notNull(),
    status: text('status')
      .notNull()
      .default('pending')
      .$type<QueueItemStatus>(),
    attempts: integer('attempts').notNull().default(0),
    error: text('error'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('event_queue_status_idx').on(table.status)],
);

export type QueueItem = typeof eventQueue.$inferSelect;
export type NewQueueItem = typeof eventQueue.$inferInsert;
