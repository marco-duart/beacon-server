# Beacon Server

Self-hosted error tracking API — a leaner, faster alternative to tools like Sentry/Bugsink, built to run comfortably on a single small VM with **zero external infrastructure** (no Postgres, no Redis).

## Why it's different

- **Embedded storage.** SQLite (via `better-sqlite3`, a synchronous native driver) instead of a database server. One file, trivial backups, no network hop on every query.
- **No broker for ingestion.** Incoming events are buffered in a SQLite table (`event_queue`) and drained by an in-process worker. `POST /events` acknowledges in milliseconds; grouping into issues happens asynchronously.
- **One system, one API key.** Each application that reports errors ("system" in Beacon) gets its own key. The key itself identifies the system — no need to pass a system name in every payload.
- **Configurable retention per system**: `unlimited`, `90d`, `30d`, `7d`, `72h`, `24h`. A cron sweep purges old events/issues automatically.
- **Pluggable e-mail notifications**, SendGrid by default, swappable via a small `MailerPort` interface.
- **Role-based dashboard access** (`admin` / `member` / `viewer`) — see [Roles & permissions](#roles--permissions).

## Architecture at a glance

```
POST /events (X-Beacon-Key) ──▶ event_queue (SQLite) ──▶ QueueWorkerService
                                                              │
                                          fingerprint(type, message, top stack frames)
                                                              │
                                              ┌───────────────┴───────────────┐
                                              ▼                               ▼
                                    upsert into `issues`              insert into `events`
                                              │
                                new issue? ──▶ NotificationsService ──▶ MailerPort (SendGrid/console)
```

- **ORM**: [Drizzle](https://orm.drizzle.team/) — schema-as-code, no generated client, minimal runtime overhead.
- **Auth**: dashboard users log in with e-mail/password (bcrypt + JWT); ingestion is authenticated with a per-system API key (`X-Beacon-Key` header, stored as a SHA-256 hash — the plaintext key is only ever shown once).
- **Scheduling**: `@nestjs/schedule` + `cron`, cron expression configurable via `RETENTION_CRON`.
- **Docs**: full OpenAPI/Swagger at `/api/docs` (and machine-readable JSON at `/api/docs-json`, consumed by the dashboard's Kubb codegen).

## Getting started

```bash
npm install
cp .env.example .env
# generate a real secret:
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env

npm run seed:admin        # creates the first dashboard user (prompts for email/password)
npm run start:dev         # boots on http://localhost:3000, Swagger at /api/docs
```

The SQLite file and migrations are created automatically on boot (`DATABASE_PATH`, default `./data/beacon.sqlite`).

### Reporting an event (what an SDK does)

```bash
curl -X POST http://localhost:3000/events \
  -H "X-Beacon-Key: bcn_live_..." \
  -H "Content-Type: application/json" \
  -d '{
        "type": "TypeError",
        "message": "Cannot read properties of undefined",
        "level": "error",
        "environment": "production",
        "stacktrace": "at handler (checkout.ts:42:7)"
      }'
```

See [`docs/integration-guide.md`](./docs/integration-guide.md) for the full payload contract and minimal SDK examples in Node/TypeScript, Ruby, Python and Java. For hands-on testing, [`postman/Beacon.postman_collection.json`](./postman/Beacon.postman_collection.json) has ready-to-run requests — login, create a system, and ten realistic error payloads (see [`postman/README.md`](./postman/README.md)).

### Listing issues (paginated)

`GET /issues` takes `page` (default `1`), `pageSize` (default `25`, max `100`), plus the optional `systemId`/`status`/`level` filters, and returns:

```json
{ "items": [ /* IssueResponseDto[] */ ], "total": 42, "page": 1, "pageSize": 25 }
```

## Roles & permissions

`npm run seed:admin` always creates/updates an **admin**; `npm run seed:user` creates/updates a `member` (default) or `viewer` (`-- --role viewer`) — handy for local dev/testing without going through the dashboard. In production, every non-admin user is created through `POST /users` (admin only), which auto-generates a temporary password, returns it **once** in the response (and e-mails it too, if `EMAIL_PROVIDER` is configured) — there is no public self-registration endpoint, by design.

| Action | admin | member | viewer |
| --- | --- | --- | --- |
| View systems, issues, events, KPIs | ✅ | ✅ | ✅ |
| Resolve / ignore / reopen an issue | ✅ | ✅ | ❌ |
| Create/update/delete a system, rotate its API key | ✅ | ❌ | ❌ |
| Manage dashboard users (`/users/*`) | ✅ | ❌ | ❌ |

A few safety rails in `UsersService`: a user can't delete their own account, can't change their own role, and the **last remaining admin** can neither be deleted nor demoted. `JwtStrategy` re-fetches the user from the database on every request (instead of trusting the JWT payload), so a deleted or demoted user loses access immediately — not just after their token expires.

`GET /auth/me` returns the caller's current `{ id, email, role }`; the dashboard calls it on load to revalidate the session instead of trusting whatever role was cached at login time.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated list of allowed origins (dashboard URL) |
| `DATABASE_PATH` | `./data/beacon.sqlite` | SQLite file path (`:memory:` for tests) |
| `JWT_SECRET` | — (required) | Secret used to sign dashboard session tokens |
| `JWT_EXPIRES_IN` | `12h` | e.g. `30m`, `12h`, `7d` |
| `QUEUE_POLL_INTERVAL_MS` | `200` | How often the ingestion worker drains `event_queue` |
| `QUEUE_BATCH_SIZE` | `25` | Max items processed per worker tick |
| `RETENTION_CRON` | `0 * * * *` | Cron expression for the retention sweep (default: hourly) |
| `EMAIL_PROVIDER` | unset | Set to `sendgrid` to enable e-mail notifications; unset logs to console instead |
| `SENDGRID_API_KEY` | — | Required when `EMAIL_PROVIDER=sendgrid` |
| `EMAIL_FROM` | — | Sender address for notification e-mails |

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run start:dev` | Dev server with watch mode |
| `npm run build` / `npm run start:prod` | Production build/run |
| `npm run test` / `test:watch` / `test:cov` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (boots the real Nest app against an in-memory SQLite DB) |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations (also runs automatically on boot) |
| `npm run db:studio` | Open Drizzle Studio against the local database |
| `npm run seed:admin` | Create or reset the password of a dashboard admin user |
| `npm run seed:user` | Create or reset the password of a `member`/`viewer` user (`-- --role viewer`, defaults to `member`) |

## Project structure

```
src/
  config/          Typed env validation + AppConfigService facade
  database/         Drizzle client, schema, migrations
  common/          Cross-module utilities (retention math, API keys, slugs, pagination, temp passwords)
  modules/
    auth/          Login (JWT), GET /auth/me, the Roles decorator + RolesGuard
    users/         Dashboard user CRUD, role management (admin only)
    systems/       Systems CRUD + API key issuance/rotation (admin only)
    ingestion/     POST /events, the SQLite-backed queue and its worker
    issues/        Paginated issue listing/detail/status (resolve/ignore needs admin or member)
    events/        Raw event listing (nested under an issue)
    retention/     Cron sweep that purges data per system's retention policy
    notifications/ MailerPort abstraction + SendGrid implementation
    kpis/          Aggregated KPIs (overview + per-system)
  scripts/         One-off scripts (seed-admin, seed-user; both built on seed-lib)
```

Each module keeps its DTOs (`*.dto.ts`), Drizzle-row-to-API mappers (`*.mapper.ts`) and specs (`*.spec.ts`) next to the code they describe.

## Testing

- **Unit tests** cover pure logic: fingerprinting, retention cutoff math, duration parsing, pagination offset math, and `RolesGuard` (mocked `ExecutionContext`/`Reflector`).
- **E2E tests** boot the full Nest app against an in-memory SQLite database (`DATABASE_PATH=:memory:`, set in `test/setup-env.ts`) and exercise real HTTP flows: login → create system → ingest an event → poll until the issue appears (`test/ingestion.e2e-spec.ts`); and the full role matrix — viewer/member permission boundaries, issue pagination, self-deletion and last-admin protection, a deleted user's token being rejected immediately (`test/rbac.e2e-spec.ts`).

Run everything with `npm run test && npm run test:e2e`.
