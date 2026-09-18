/**
 * Creates (or resets the password of) a regular dashboard user.
 * Run with `npm run seed:user -- --email you@beacon.dev --password ... --role member`
 * or omit the flags to be prompted for email/password interactively.
 * `--role` defaults to "member" and accepts "member" or "viewer" (use
 * `npm run seed:admin` for admins).
 */
import { USER_ROLES, type UserRole } from '../database/schema';
import { readArg, seedUser } from './seed-lib';

function resolveRole(): UserRole {
  const value = readArg('--role') ?? 'member';
  if (!USER_ROLES.includes(value as UserRole)) {
    console.error(
      `Invalid --role "${value}". Expected one of: ${USER_ROLES.join(', ')}`,
    );
    process.exit(1);
  }
  return value as UserRole;
}

const role = resolveRole();
const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

seedUser(role, roleLabel).catch((error: unknown) => {
  console.error('Failed to seed user:', error);
  process.exitCode = 1;
});
