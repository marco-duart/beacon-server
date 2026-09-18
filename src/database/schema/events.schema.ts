import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { issues } from './issues.schema';
import { systems } from './systems.schema';

export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    issueId: integer('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    systemId: integer('system_id')
      .notNull()
      .references(() => systems.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    stacktrace: text('stacktrace'),
    environment: text('environment'),
    release: text('release'),
    tags: text('tags'),
    extra: text('extra'),
    timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
    receivedAt: integer('received_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('events_issue_idx').on(table.issueId),
    index('events_system_timestamp_idx').on(table.systemId, table.timestamp),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
