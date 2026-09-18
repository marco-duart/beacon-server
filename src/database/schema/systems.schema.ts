import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { RetentionPolicy } from '../../common/retention-policy';

export const systems = sqliteTable('systems', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  apiKeyHash: text('api_key_hash').notNull().unique(),
  apiKeyPrefix: text('api_key_prefix').notNull(),
  retentionPolicy: text('retention_policy')
    .notNull()
    .default('unlimited')
    .$type<RetentionPolicy>(),
  notifyEmails: text('notify_emails'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type System = typeof systems.$inferSelect;
export type NewSystem = typeof systems.$inferInsert;
