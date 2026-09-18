/**
 * Creates (or resets the password of) a dashboard admin user.
 * Run with `npm run seed:admin -- --email you@beacon.dev --password ...`
 * or omit the flags to be prompted interactively.
 */
import { seedUser } from './seed-lib';

seedUser('admin', 'Admin').catch((error: unknown) => {
  console.error('Failed to seed admin user:', error);
  process.exitCode = 1;
});
