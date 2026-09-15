# Development guide

This document is the local development and repository verification runbook for UNDERGAMMON.

## Requirements

- Node.js 24
- pnpm 12.4.1
- Docker with Compose 2.24.4 or newer

Install the repository-pinned pnpm major/version:

```sh
npm install --global pnpm@12.4.1
pnpm install --frozen-lockfile
```

## Local application setup

Start the disposable PostgreSQL test service and create a local environment file:

```sh
docker compose -f compose.test.yaml up -d --wait
cp .env.example .env
```

Set `BOT_TOKEN`, `BOT_USERNAME` and any other values required by the path you are exercising in `.env`.

Build the workspace and run the backend:

```sh
pnpm build
node --env-file=.env apps/server/dist/index.js
```

In a separate terminal, run the Mini App development server:

```sh
pnpm --filter @undergammon/miniapp dev
```

Open `http://localhost:5173`.

Normal browser visits show the Telegram landing page. There is **no development authentication bypass**. Actual Telegram launch requires a Telegram-accessible HTTPS origin and a real bot. Automated browser tests instead sign synthetic launch data with a test-only token against the real authentication implementation; the test harness never ships as an authentication route.

## Docker-only local smoke stack

A Docker-only local smoke stack is also available:

```sh
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --build --wait
```

Landing page/API health is then available at `http://localhost:8080`.

The development override binds the web port to loopback and turns off HTTPS cookies for local HTTP. Never use `compose.dev.yaml` in production.

The disposable test database is separate from the production database and binds only `127.0.0.1:55432`.

## Repository verification

The local verification sequence corresponding to the repository CI baseline is:

```sh
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
TEST_DATABASE_URL=postgresql://undergammon_test:local_test_only@127.0.0.1:55432/undergammon_test pnpm test
pnpm exec playwright install chromium
TEST_DATABASE_URL=postgresql://undergammon_test:local_test_only@127.0.0.1:55432/undergammon_test pnpm test:e2e
pnpm audit --prod --audit-level high
docker compose --env-file .env.example config --quiet
```

`pnpm test:ci` is the CI test entry point and currently maps to the same Vitest run.

On PowerShell, set the test database variable before the test command, for example:

```powershell
$env:TEST_DATABASE_URL='postgresql://undergammon_test:local_test_only@127.0.0.1:55432/undergammon_test'
```

## Database safety

Integration tests truncate their database. **Never set `TEST_DATABASE_URL` to a real application or production database.**

Without `TEST_DATABASE_URL`, database-dependent tests are explicitly skipped. CI supplies an isolated PostgreSQL 18 service and runs the database and browser suites against it.

Build shared packages before typechecking because workspace exports point at generated `dist` output.

## Useful references

- [Documentation index](../README.md)
- [Current implementation status](../../IMPLEMENTATION_STATUS.md)
- [CI/testing architecture](../architecture/30-ci-testing-and-repository-workflow.md)
- [Hosting and deployment architecture](../architecture/22-hosting-and-deployment.md)
