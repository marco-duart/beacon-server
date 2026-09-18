import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { systems } from './systems.schema';

export const ISSUE_LEVELS = ['fatal', 'error', 'warning', 'info'] as const;
export type IssueLevel = (typeof ISSUE_LEVELS)[number];

export const ISSUE_STATUSES = ['open', 'resolved', 'ignored'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const issues = sqliteTable(
  'issues',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    systemId: integer('system_id')
      .notNull()
      .references(() => systems.id, { onDelete: 'cascade' }),
    fingerprint: text('fingerprint').notNull(),
    type: text('type').notNull(),
    message: text('message').notNull(),
    level: text('level').notNull().$type<IssueLevel>(),
    environment: text('environment'),
    release: text('release'),
    status: text('status').notNull().default('open').$type<IssueStatus>(),
    count: integer('count').notNull().default(0),
    firstSeen: integer('first_seen', { mode: 'timestamp_ms' }).notNull(),
    lastSeen: integer('last_seen', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('issues_system_fingerprint_idx').on(
      table.systemId,
      table.fingerprint,
    ),
    index('issues_system_status_idx').on(table.systemId, table.status),
    index('issues_last_seen_idx').on(table.lastSeen),
  ],
);

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
