# UNDERGAMMON Agent Guide

## Start here

UNDERGAMMON is a Telegram-first online Long Nardy / Classic Backgammon project.

Before implementing or changing product behavior, read the relevant documents under:

- `docs/product/`
- `docs/architecture/`

Those documents are the project source of truth. If accepted documents appear to conflict, prefer the later and more specific decision. Direct user instructions for the current task take precedence.

Keep this file short. Detailed decisions belong in `docs/`.

## Legacy reference

The frozen repository `tracerxbrhd/backgammon` is reference material only. Inspect it when useful for game-engine algorithms, move generation, AI ideas, serialization and tests. Do not copy its repository architecture wholesale and do not import legacy infrastructure without a concrete need.

## Target shape

```text
apps/
  miniapp/
  bot/
  server/

packages/
  game-engine/
  protocol/
```

This is a pnpm TypeScript monorepo. Do not add Nx or Turborepo.

## Non-negotiable architecture

- TypeScript strict mode.
- Avoid `any`, `@ts-ignore`, hidden global state and duplicated business logic.
- `packages/game-engine` is deterministic and framework-free.
- Game rules do not depend on React, Telegram, HTTP, WebSocket, PostgreSQL or wall-clock time.
- The backend is authoritative for dice, moves, timers, match state, winner, rating, XP and Coins.
- Never trust client-provided authoritative state.
- Telegram raw `initData` must be validated on the backend before identity is trusted.
- Telegram user ID is an external identity, never the primary domain account ID.
- PostgreSQL is the initial durable store. Do not add Redis, queues, microservices or Kubernetes without an objective need.
- Realtime uses a typed/versioned plain WebSocket command/event protocol, not Socket.IO.
- Persist authoritative active-match state sufficiently for reconnect and normal server restart recovery.
- Critical match finalization, economy and rating operations must be transactional and idempotent.

## Product priorities

Season 0 is a real open beta, not a mock/demo. Prioritize a coherent playable vertical slice:

1. both Long Nardy and Classic Backgammon rules;
2. Telegram authentication and Game Accounts;
3. private challenge, casual matchmaking and ranked matchmaking;
4. authoritative PvP lifecycle, dice, timers and reconnect;
5. rating/seasons, XP, Coins ledger, profile/history/leaderboards;
6. bot integration and touch-first Mini App;
7. Docker deployment and CI;
8. optional Season 0 additions only after the above is healthy.

Do not sacrifice multiplayer correctness for cosmetic breadth.

## Repository and deployment constraints

- Production: one VPS, Docker Compose, Caddy, PostgreSQL.
- Public origin: `https://undergammon.tracerxbrhd.ru`.
- Local + production only; no staging environment.
- Production deployment is manually triggered through GitHub Actions.
- Production Telegram bot uses webhook routing as documented in `docs/architecture/22-hosting-and-deployment.md`; local development may use polling if useful.
- The repository is public/source-visible but proprietary, not open source.

## Testing expectations

Game rules are critical code. Add or preserve unit/property/regression tests for rule edge cases and deterministic invariants.

Server integration tests should cover concurrency-sensitive behavior such as challenge acceptance, duplicate commands, stale state versions, match finalization, rating/economy application and reconnect.

Before finishing substantial implementation work, run the repository's available lint, format check, typecheck, tests and production builds. Fix failures rather than merely documenting them.

## Working style

Inspect existing code before editing it. Prefer evolutionary changes once implementation exists. Keep blast radius minimal unless the task is explicitly a large implementation mission.

Do not leave fake security or gameplay implementations just to make UI appear functional. If an external setup step is unavailable, implement the integration boundary, document the requirement and continue with work that can be completed safely.
