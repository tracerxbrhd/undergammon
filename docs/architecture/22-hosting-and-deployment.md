# Hosting and Deployment

## Status
Accepted for Season 0.

## Production topology

UNDERGAMMON will initially run on a single VPS using Docker Compose.

Public origin:

- `https://undergammon.tracerxbrhd.ru`

Recommended routing:

- `/` -> Mini App static assets
- `/api/*` -> backend HTTP API
- `/ws` -> backend realtime WebSocket endpoint
- `/telegram/webhook` -> Telegram bot webhook
- `/health` -> service health endpoint

Caddy terminates HTTPS and proxies traffic to services inside the Docker network.

PostgreSQL must not expose port `5432` publicly. It is reachable only from internal application services.

## Environments

The project uses two operational environments:

- local development;
- production.

There is no dedicated staging environment. This is the default policy while the project remains small and releases are manually controlled. A staging environment may be reconsidered only if an objective operational need appears later.

## Docker

Docker is part of the repository and deployment model from the beginning.

The repository should contain:

- Dockerfiles for deployable applications;
- `compose.yaml`;
- development Compose overrides where useful;
- Caddy configuration;
- healthchecks;
- persistent PostgreSQL volume configuration;
- `.env.example` without secrets.

Production credentials, Telegram bot tokens, database passwords, webhook secrets and other secrets must never be committed.

## Production deployment

CI runs automatically on pull requests and pushes and should include at least:

- lint;
- typecheck;
- tests;
- build.

Production deployment is not triggered automatically by every merge to `main`.

A manual GitHub Actions workflow is used to deploy production. Conceptually it performs:

1. obtain/build the intended application version;
2. connect to the VPS;
3. update the Docker deployment;
4. run pending database migrations;
5. start/update services with Docker Compose;
6. verify healthchecks.

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

Automated off-site PostgreSQL backups are intentionally not required for the initial Season 0 launch.

The architecture must not prevent adding them later, but they are deferred while early beta data is considered recoverable/non-critical.

For Season 0:

- PostgreSQL data lives in a persistent Docker volume;
- the operator may create manual `pg_dump` backups and store them outside the VPS;
- backup files must never be committed to the repository;
- documented manual backup and restore procedures should exist before production use.

Loss of the VPS or its storage can still result in data loss until off-site automated backups are introduced. This risk is explicitly accepted for early testing.

## Scaling position

Do not introduce Kubernetes, Redis, queues, service discovery or multiple production hosts preemptively.

The public hostname should remain stable even if components are moved to separate infrastructure later. The single-VPS design is therefore an operational starting point, not a domain or protocol constraint.
