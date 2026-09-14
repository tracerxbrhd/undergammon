# Authentication and Session Model

## Status
Accepted architecture decision for UNDERGAMMON.

## Core decision
Telegram is the only login provider implemented for Season 0, but the domain account is provider-independent so browser login can be added later without redesigning ratings, history, economy, progression, or match ownership.

## Identity model

```text
GameAccount
    |
    +-- AccountIdentity
            provider
            providerSubject
```

`GameAccount` is the canonical domain identity. For Season 0 the only identity provider is `TELEGRAM`. The `(provider, providerSubject)` pair is unique.

Telegram user ID must never become the Game Account primary key.

No browser login, email/password, passkeys, OAuth providers, or account-linking UI are implemented in Season 0.

## Telegram authentication flow

1. Telegram launches the Mini App and provides raw `initData`.
2. Mini App sends it to the backend authentication endpoint.
3. Backend validates Telegram authenticity and freshness.
4. Backend resolves or creates the linked AccountIdentity and GameAccount.
5. Backend checks account status (`ACTIVE`, `SUSPENDED`, `BANNED`).
6. Backend creates an UNDERGAMMON application session.

Client-provided Telegram identity data is never authoritative until validated by the backend.

## Application sessions

Use cryptographically random opaque session identifiers backed by PostgreSQL.

- Session is delivered through an `HttpOnly` and `Secure` cookie.
- Session records have explicit expiration and can be revoked.
- Redis is not required for Season 0.
- Reopening the Mini App may authenticate through Telegram again and issue or rotate the application session.
- Suspended or banned accounts cannot establish a usable session.
- The same session abstraction can later serve a browser authentication provider.

## Same-origin deployment

The planned public origin is:

```text
https://undergammon.tracerxbrhd.ru
```

Mini App, HTTP API, and WebSocket endpoint share that origin. This avoids unnecessary cross-origin authentication complexity.

## Realtime authorization

WebSocket connections require a valid UNDERGAMMON session. Every gameplay command is still authorized and validated against authoritative backend match state.

A valid session never grants control over another account or player seat. The previously accepted single-controlling-session/takeover rule for multiple devices remains separate from authentication.

## Security boundaries

- Authentication and authorization are backend responsibilities.
- Telegram identity is accepted only after backend validation.
- Deep links, challenge tokens, and match IDs are not authentication credentials.
- Admin permissions are checked on the backend; client-side visibility of the Admin tab is presentation only.
- Authentication credentials and session material must not be written to application logs.

## Deferred work

Not part of Season 0:

- browser login;
- email/password authentication;
- passkeys;
- third-party OAuth providers;
- account-linking UI;
- recovery flows for non-Telegram identities;
- Redis-backed sessions.

When browser login becomes a real requirement, add another AccountIdentity provider linked to the existing GameAccount rather than introducing a second domain-user model.
