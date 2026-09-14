# UNDERGAMMON

Telegram-first online Long Nardy and Classic Backgammon.

The project is moving from specification into Season 0 implementation.

## Documentation

Approved product decisions live in [`docs/product`](docs/product).

Approved technical decisions live in [`docs/architecture`](docs/architecture).

Agents and contributors should read [`AGENTS.md`](AGENTS.md) before making implementation changes.

## Baseline

- Node.js 24 LTS
- pnpm workspaces
- strict TypeScript
- React + Vite Mini App
- Fastify + WebSocket backend
- grammY Telegram bot
- PostgreSQL
- Docker Compose + Caddy

The target production origin is `https://undergammon.tracerxbrhd.ru`.

The repository is public/source-visible but is not intended to be open source. See `docs/architecture/28-security-and-source-licensing.md` for the accepted policy.
