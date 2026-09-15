# Hosting and Deployment

## Status
Accepted for Season 0 and in production.

## Production topology

UNDERGAMMON currently runs on a single VPS using Docker Compose.

Public origin:

- `https://undergammon.tracerxbrhd.ru`

Current routing:

- `/` -> Mini App static assets
- `/api/*` -> backend HTTP API
- `/ws` -> backend realtime WebSocket endpoint
- `/telegram/webhook` -> Telegram bot webhook
- `/health` -> service health endpoint

Caddy terminates HTTPS and proxies traffic to services inside the Docker network.

PostgreSQL does not expose port `5432` publicly. It is reachable only from internal application services.

## Environments

The project uses two operational environments:

- local development;
- production.

There is no dedicated staging environment. This is the current policy while the project remains small and releases are manually controlled. A staging environment may be reconsidered only if an objective operational need appears later.

## Docker

Docker is part of the repository and production deployment model.

The repository contains:

- Dockerfiles for deployable applications;
- `compose.yaml`;
- development Compose overrides where useful;
- Caddy configuration;
- healthchecks;
- persistent PostgreSQL volume configuration;
- `.env.example` without secrets.

Production credentials, Telegram bot tokens, database passwords, webhook secrets and other secrets must never be committed.

## Production deployment

CI runs automatically on pull requests and pushes to `main` and includes the repository verification pipeline for build, lint, format, typecheck, tests/E2E, production dependency audit and Compose validation.

Production deployment is not triggered automatically by every merge to `main`.

A manual GitHub Actions workflow is used to deploy production. It:

1. runs the verification workflow for the selected commit;
2. connects to the VPS;
3. checks out the selected commit;
4. builds the Docker deployment;
5. starts PostgreSQL and runs pending database migrations;
6. starts/updates services with Docker Compose;
7. verifies the public health endpoint.

Manual deployment reduces the chance of unexpectedly restarting a realtime game server while active matches exist.

## Database migrations

Production schema changes are versioned and committed through Drizzle migrations.

Rules:

- production schema is not normally edited manually;
- pending migrations are part of the deployment workflow;
- a failed migration prevents the new application deployment from proceeding;
- prefer backward-compatible additive migrations;
- destructive schema changes should be separated from code rollout when practical;
- direct production database edits are reserved for exceptional recovery situations.

## Backups

Automated off-site PostgreSQL backups remain intentionally deferred for the current Season 0 operational baseline.

The architecture does not prevent adding them later. For Season 0:

- PostgreSQL data lives in a persistent Docker volume;
- the operator can create manual `pg_dump` backups and store them outside the VPS;
- backup files must never be committed to the repository;
- manual backup and restore procedures are documented in `README.md`.

Loss of the VPS or its storage can still result in data loss until off-site automated backups are introduced. This risk is explicitly accepted for early testing.

## Scaling position

Do not introduce Kubernetes, Redis, queues, service discovery or multiple production hosts preemptively.

The current backend/realtime deployment is intentionally single-instance. The public hostname should remain stable even if components are moved to separate infrastructure later. The single-VPS design is therefore the current operational model, not a domain or protocol constraint.
