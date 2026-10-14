# Phase 2 validation evidence

Date: 2026-10-14 (UTC). Runtime used Node.js 24.19.0, PostgreSQL 17.11, Redis 7.4 and the committed Prisma 6.19 client. Development and test databases/Redis instances use separate containers, ports, credentials and volumes. E2E tests select `TEST_DATABASE_URL` and `TEST_REDIS_*`, and generate a unique BullMQ prefix per run.

## Results

| Check                                      | Result                  |
| ------------------------------------------ | ----------------------- |
| Prisma schema validate and client generate | Pass                    |
| PostgreSQL/Redis Compose health checks     | Four containers healthy |
| Test database migration status             | No pending migrations   |
| TypeScript strict typecheck                | Pass                    |
| ESLint typed lint                          | Pass                    |
| Unit tests                                 | 25 passed               |
| HTTP e2e tests                             | 11 passed               |
| PostgreSQL constraint and seed tests       | 22 passed               |
| Nest production build                      | Pass                    |

HTTP tests connect to real PostgreSQL and Redis and exercise a real BullMQ worker job. They cover live/readiness responses, OpenAPI output, nested transformation/validation, unknown fields, malformed and oversized JSON, masked 500 errors, safe degraded health, Redis atomic counters, fail-closed limiter behavior, 429 responses, request IDs, security headers and CORS allowlisting. The PostgreSQL suite reran unchanged and still verifies Phase 1 database constraints and idempotent seed behavior.

The compiled production server also started on a separate port and returned live status, all three readiness checks `up`, and OpenAPI version `v1`; it then shut down cleanly. The existing listener on port 4000 was left untouched.

## Local commands

From `backend/`:

```bash
npm run prisma:validate
npm run prisma:generate
npm run infra:up:test
npm run db:migrate:test
npm run check
npm run test:db
```

The setup helpers keep credentials in ignored `.env` and `.runtime/` files with restrictive permissions. Never commit them or print database/Redis connection strings. `npm run infra:down` stops the local dependency containers while retaining volumes.

## Scope and limits

Phase 2 provides infrastructure and health probes, not account authentication, authorization, cinema CRUD, booking, seat holds, payment or tickets. `seat-expiration` is registered for later use but has no expiry processor. Bearer auth is an OpenAPI scheme only. TC01–TC05 business API acceptance tests remain for their requested phases.

Prisma client generation/build use the already installed and verified engine. A fresh engine checksum request to `binaries.prisma.sh` still returned HTTP 403 in this cloud, so fresh-download readiness is not verified. Checksum/TLS validation was not bypassed. Prisma 6.19 also prints the upstream notice that `package.json#prisma` will be deprecated in Prisma 7; the pinned 6.19 migration/seed commands passed.
