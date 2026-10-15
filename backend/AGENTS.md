# NOVA backend workflow

This subtree is a standalone NestJS/TypeScript package. Install and run its commands from `backend/`; the root package is the separate Next.js frontend. Use Node.js from `.nvmrc` and `npm ci` with the committed backend lockfile. In the cloud, pass `--cache /workspace/.npm-cache` to npm installation commands.

Read `README.md`, `docs/architecture.md` and `docs/phases.md` before implementation. Implement only the phase explicitly requested by the user. Their master prompt states: after each phase, stop and wait for `TIẾP TỤC PHASE X`, unless the user explicitly requests continuous implementation. Do not advance phases merely because dependencies are installed. Update phase status and evidence after checks pass.

Keep controllers free of database/business logic. Services own transaction boundaries; repositories accept transaction clients. Keep TypeScript strict, DTO validation, Decimal money, UTC timestamps, database constraints and idempotency. Never disable checksum or TLS verification to make Prisma engine downloads succeed. Do not label unimplemented database/auth/booking/payment/ticket behavior as working.

Validation: `npm run check` performs typecheck, typed lint, unit tests, HTTP e2e tests and build. Verify the built entrypoint with a real HTTP request when changing startup. Native argon2 must load on the selected runtime. Business TC01–TC05 require real isolated PostgreSQL and Redis once those phases exist; bootstrap tests do not replace them.

The user authorizes automatic commits and normal pushes to GitHub after completed coding work and passing checks. Preserve remote and unrelated local changes; never force-push. Do not commit `.env`, credentials, node_modules, dist or coverage.

From Phase 7, keep each HTTP/Socket.IO test app listening on its own free localhost port until suite teardown. Run HTTP integration suites and scripts/smoke-booking.cjs sequentially when sharing TEST_DATABASE_URL: different Redis prefixes do not isolate the shared outbox. Application instances sharing a database/outbox must use the same Redis DB and BULLMQ_PREFIX. Reconnect clients must reload the seat snapshot; never claim exactly-once or ordered WebSocket delivery.

Phase9 adds FulfillmentRelay and TicketEmailProcessor. Phase8 transaction tests explicitly stop FulfillmentRelay to assert pending ticket requests; Phase9 integration/production smoke must exercise actual fulfillment. Keep SMTP fixtures on owned loopback ports and never send test messages through an external provider. Email outbox acknowledgement means SMTP acceptance; never claim exactly-once email delivery or inbox receipt.
