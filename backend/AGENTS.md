# NOVA backend workflow

This subtree is a standalone NestJS/TypeScript package. Install and run its commands from `backend/`; the root package is the separate Next.js frontend. Use Node.js from `.nvmrc` and `npm ci` with the committed backend lockfile. In the cloud, pass `--cache /workspace/.npm-cache` to npm installation commands.

Read `README.md`, `docs/architecture.md` and `docs/phases.md` before implementation. Implement only the phase explicitly requested by the user. Their master prompt states: after each phase, stop and wait for `TIẾP TỤC PHASE X`, unless the user explicitly requests continuous implementation. Do not advance phases merely because dependencies are installed. Update phase status and evidence after checks pass.

Keep controllers free of database/business logic. Services own transaction boundaries; repositories accept transaction clients. Keep TypeScript strict, DTO validation, Decimal money, UTC timestamps, database constraints and idempotency. Never disable checksum or TLS verification to make Prisma engine downloads succeed. Do not label unimplemented database/auth/booking/payment/ticket behavior as working.

Validation: `npm run check` performs typecheck, typed lint, unit tests, HTTP e2e tests and build. Verify the built entrypoint with a real HTTP request when changing startup. Native argon2 must load on the selected runtime. Business TC01–TC05 require real isolated PostgreSQL and Redis once those phases exist; bootstrap tests do not replace them.

The user authorizes automatic commits and normal pushes to GitHub after completed coding work and passing checks. Preserve remote and unrelated local changes; never force-push. Do not commit `.env`, credentials, node_modules, dist or coverage.
