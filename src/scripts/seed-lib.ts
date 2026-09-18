import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { users, type UserRole } from '../database/schema';

const SALT_ROUNDS = 12;

export function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function promptFor(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

function connect() {
  const databasePath = process.env.DATABASE_PATH ?? './data/beacon.sqlite';
  const dbDir = dirname(databasePath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(databasePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema: { users } });
  migrate(db, { migrationsFolder: 'drizzle/migrations' });

  return { db, sqlite };
}

export async function seedUser(
  role: UserRole,
  roleLabel: string,
): Promise<void> {
  const { db, sqlite } = connect();

  const email = readArg('--email') ?? (await promptFor(`${roleLabel} email: `));
  const password =
    readArg('--password') ??
    (await promptFor(`${roleLabel} password (min 8 chars): `));

  if (!email || !password || password.length < 8) {
    console.error(
      'Email and a password with at least 8 characters are required.',
    );
    process.exitCode = 1;
    sqlite.close();
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, role })
      .where(eq(users.id, existing.id));
    console.log(
      `Password updated for existing ${roleLabel.toLowerCase()} "${email}".`,
    );
  } else {
    await db.insert(users).values({ email, passwordHash, role });
    console.log(`${roleLabel} "${email}" created.`);
  }

  sqlite.close();
}
