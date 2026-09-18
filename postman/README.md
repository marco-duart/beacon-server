# Beacon — Postman collection

`Beacon.postman_collection.json` is a self-contained Postman (v2.1) collection for `beacon-server` — import it into Postman, Insomnia or Bruno, or run it headless with [Newman](https://github.com/postmanlabs/newman).

## Setup

1. Start the server (`npm run start:dev`) and make sure an admin exists:
   ```bash
   npm run seed:admin -- --email admin@beacon.dev --password super-secret-123
   ```
2. Import the collection. Its variables already default to `baseUrl=http://localhost:3000` and those same admin credentials — edit the collection's Variables tab if yours differ.
3. Run **1. Auth → Login (admin)**, then **2. Systems → Create System**. Their test scripts capture `accessToken`, `systemId` and `systemApiKey` into collection variables automatically — every other request reads from those, so nothing needs to be copy-pasted by hand.

After that, everything in **3. Ingestion (error payloads)** is ready to fire individually, or run the whole collection top-to-bottom with the Collection Runner (or `npx newman run postman/Beacon.postman_collection.json`).

## Folders

- **1. Auth / 2. Systems** — bootstrap: log in, create a system, capture its API key.
- **3. Ingestion (error payloads)** — ten realistic `POST /events` examples across Node/TS, Java, Python and Ruby: different levels (`fatal`/`error`/`warning`/`info`), a string stack trace vs. structured stack frames, `tags`/`extra` context, a minimal required-fields-only payload, an explicit `timestamp` (backfill), and a deliberate duplicate of the first error to demonstrate that Beacon groups repeat occurrences into the same issue (`count` increments) instead of creating a new one each time.
- **4. Ingestion — validation errors (sad path)** — a missing required field, an invalid `level` value, and a missing `X-Beacon-Key` header, so you can see the API reject bad input (`400`/`401`) instead of accepting it.
- **5. Issues** — list (paginated), filter by system, fetch one issue and its raw events, resolve it.
- **6. KPIs** — overview, both global and scoped to the created system.

## Notes

- Ingestion is async (`POST /events` returns `202` immediately); give the queue worker a moment (default poll interval 200ms) before checking **5. Issues** for freshly-sent events.
- Every ingestion request's `type`+`message`+top-stack-frames is fingerprinted server-side — reuse the "same TypeError again" request (or tweak any other one to match an earlier payload) to see grouping in action instead of a flood of one-off issues.
