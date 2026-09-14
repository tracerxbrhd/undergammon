# Technical Foundation and Docker Stack

## Status

Accepted for the initial UNDERGAMMON implementation.

## Repository shape

UNDERGAMMON will use a single TypeScript monorepo managed with `pnpm` workspaces. No additional monorepo framework such as Nx or Turborepo is required initially.

```text
apps/
  miniapp/
  bot/
  server/

packages/
  game-engine/
  protocol/

docs/
  product/
  architecture/

infra/
  caddy/

compose.yaml
compose.dev.yaml
```

The structure may grow only when a concrete need appears. Shared packages must not become generic dumping grounds.

## Runtime and language

- Node.js 24 LTS is the production baseline.
- TypeScript is used across the backend, bot, Mini App and shared packages.
- TypeScript runs in strict mode.
- Avoid `any`, `@ts-ignore`, hidden global state and duplicated business rules.
- Production dependencies are pinned through the lockfile.

Node 24 is chosen instead of Node 26 because Node 24 is the current LTS line, while Node 26 is still Current at the time of this decision.

## Mini App

`apps/miniapp`:

- React 19
- Vite 8
- Tailwind CSS 4
- native browser WebSocket client wrapped by a typed application transport
- TanStack Query for request/response server state where it provides value
- local React state/reducers for screen-local and game-turn draft state

Do not introduce Redux or another global state framework until the application demonstrates a concrete need for it.

The Mini App integrates with Telegram through a small adapter around the Telegram Mini Apps JavaScript API. Telegram-specific APIs must not leak into game rules or general domain code.

Telegram `initDataUnsafe` is never authoritative. Raw `initData` is sent to the backend and validated there before a Telegram identity is trusted.

The visual system should use design tokens and reusable primitives, while the board remains a purpose-built responsive game UI. Board geometry, hit targets and animations must derive from container geometry rather than fixed screen coordinates.

## Bot

`apps/bot`:

- grammY
- TypeScript
- initially a thin Telegram integration layer

Responsibilities include launch flows, challenge/invite delivery, transactional notifications and recovery deep links. Business rules remain in the server/domain layer.

A single bot instance may use long polling initially because it keeps deployment simple. Webhooks can replace it later if horizontal scaling or operational requirements justify the change.

## Server

`apps/server`:

- Fastify for HTTP APIs
- WebSocket transport using the Fastify/WebSocket ecosystem backed by `ws`
- Zod schemas at external boundaries and in the shared realtime protocol
- structured logging

HTTP is used for request/response operations such as authentication bootstrap, profile, history, settings, economy and admin operations.

WebSocket is used for live match state, authoritative gameplay commands, queue status, connection ownership and reconnect/resynchronization.

The server is authoritative for dice, legal moves, committed match state, timers, match results, rating, XP and economy changes.

Socket.IO is intentionally not required initially. UNDERGAMMON needs explicit application-level reconnect and authoritative snapshot recovery regardless of transport, so a plain typed WebSocket protocol keeps the wire model simpler.

## Game engine

`packages/game-engine` is framework-free TypeScript.

It must not import React, Telegram APIs, Fastify, database code, WebSocket code or presentation logic.

It contains deterministic rules and state transitions for Long Nardy and Classic Backgammon. Random values such as dice are supplied to the engine by the authoritative server rather than generated inside UI code.

Testing baseline:

- Vitest for unit tests
- `fast-check` for property-based tests where useful for rules invariants
- integration tests around server-authoritative match flows

## Shared protocol

`packages/protocol` contains only contracts genuinely shared between the Mini App and server, especially realtime messages, command/result envelopes, stable enums and boundary schemas.

It must not become a general `shared` package containing unrelated helpers.

Protocol messages should be versionable and command handling must support rejection of stale state/version commands.

## Database

- PostgreSQL 18
- Drizzle ORM with the PostgreSQL driver
- explicit SQL migrations committed to the repository

PostgreSQL is the durable source of truth for accounts, Telegram identities, ratings, seasons, match metadata/history, XP, Coins ledger, cosmetics ownership, sanctions, admin audit records and other persistent state.

Redis is not part of the initial architecture. It should be introduced only when multiple server instances, distributed coordination, ephemeral shared queues or measured performance requirements make it necessary.

## Persistence principles

Economy changes use an append-style ledger rather than unexplained direct balance rewrites.

Administrative rating and Coin corrections are explicit adjustment operations with actor, reason, before/after values and timestamp.

Match recovery uses authoritative persisted/technical state as required by the lifecycle design; the client is never the persistence authority.

## Docker and hosting

Docker support is part of the repository from the first implementation, not a later deployment task.

The initial Docker Compose topology is intentionally small:

```text
Caddy / Web
  ├─ serves the built Mini App over HTTPS
  ├─ reverse proxies /api -> server
  └─ reverse proxies /ws  -> server

Server
Bot
PostgreSQL
```

Expected repository artifacts include:

- `compose.yaml` for the production-like stack
- `compose.dev.yaml` for development overrides where useful
- multi-stage Dockerfiles for deployable applications
- `infra/caddy/Caddyfile`
- health checks
- persistent PostgreSQL volume
- `.env.example`

Application images should use a supported Node 24 LTS base and multi-stage builds so development dependencies do not ship in runtime images.

Secrets such as the Telegram bot token, database credentials and administrator allowlist are injected at runtime and never baked into images or committed to Git.

Caddy is the initial edge/reverse-proxy choice because it gives a compact HTTPS/static/reverse-proxy setup suitable for a single Docker host. This does not become a domain dependency and may be replaced later without changing application architecture.

## Explicit non-goals for the initial architecture

- no microservices decomposition
- no Redis by default
- no Kafka/RabbitMQ/event bus
- no Kubernetes
- no service mesh
- no separate API gateway product
- no Nx/Turborepo requirement
- no GraphQL requirement
- no client-authoritative gameplay

The target is a clean modular monolith plus separate Telegram bot and Mini App processes, capable of evolving without carrying infrastructure intended for traffic that does not yet exist.
