import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Logger, Provider } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { AppConfigService } from '../config/app-config.service';
import * as schema from './schema';
import { DRIZZLE } from './database.constants';

export type DrizzleDatabase = BetterSQLite3Database<typeof schema>;

const logger = new Logger('Database');

export const databaseProvider: Provider = {
  provide: DRIZZLE,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): DrizzleDatabase => {
    const dbDir = dirname(config.databasePath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const sqlite = new Database(config.databasePath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 5000');

    const db = drizzle(sqlite, { schema });

    const migrationsFolder = join(process.cwd(), 'drizzle', 'migrations');
    if (existsSync(migrationsFolder)) {
      migrate(db, { migrationsFolder });
      logger.log(`Applied migrations from ${migrationsFolder}`);
    } else {
      logger.warn(
        `No migrations folder found at ${migrationsFolder}, skipping migrate()`,
      );
    }

    logger.log(`SQLite database ready at ${config.databasePath}`);
    return db;
  },
};
