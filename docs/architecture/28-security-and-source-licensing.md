# 28. Security and Source Licensing

## Repository visibility

UNDERGAMMON remains a public GitHub repository during development and after release.

Public source availability is intended to improve transparency, auditability and user trust, especially around deterministic game rules, server-authoritative gameplay and dice fairness.

Public visibility must never be treated as a security boundary. The backend must remain secure even when an attacker can read the entire source tree.

## Licensing model

UNDERGAMMON is **not open source**.

The source code is publicly viewable for inspection and study, but the project owner retains all copyright and usage rights except those rights that GitHub itself must grant to users in order to provide normal public-repository functionality.

No permission is granted to third parties to:

- reuse the code in another project;
- copy substantial portions of the implementation;
- modify and redistribute the code;
- publish derivative versions;
- commercially exploit the code;
- sublicense the code.

Any additional use requires explicit permission from the copyright owner.

The repository bootstrap must therefore include a clear proprietary `LICENSE` / copyright notice and a matching notice in `README.md`. It must not use MIT, Apache, GPL or another open-source license unless the owner intentionally changes this policy later.

## GitHub-specific limitation

Because the repository is public on GitHub, GitHub's Terms of Service allow other GitHub users to view and fork the repository through GitHub's normal service functionality. This platform permission does not imply a general open-source license or permission to reuse the code outside the rights required by GitHub's service.

## Security baseline

The repository may contain normal deployable infrastructure and application source, including:

- Dockerfiles and Compose configuration;
- reverse-proxy configuration;
- Mini App source;
- bot source;
- backend source;
- `game-engine`;
- shared protocol contracts;
- example environment configuration with non-secret placeholders.

Production secrets, private keys, authentication material, database dumps and real user data must never be committed.

## Application-security principles

Season 0 must implement at least the following baseline controls:

- server-side Telegram Mini App authentication validation;
- short-lived UNDERGAMMON sessions rather than trusting client identity claims;
- server-authoritative dice, moves, outcomes, rating and economy;
- strict runtime validation of HTTP and WebSocket input;
- command authorization against the authenticated Game Account;
- versioned/idempotent critical realtime commands;
- rate limiting for sensitive and abuse-prone endpoints;
- defensive origin/host checks where appropriate;
- no secrets or raw Telegram authentication payloads in application logs;
- database constraints and transactions for critical invariants;
- dependency/security scanning in CI where practical;
- dependency update automation such as Dependabot;
- documented vulnerability reporting policy before public release.

## Architectural consequence

The public availability of `packages/game-engine` is acceptable and desirable. Knowing the game rules or move-generation algorithm must provide no ability to influence authoritative dice, submit illegal moves, forge match results or change economy/rating state because all such decisions remain server-side.

## Decision

UNDERGAMMON uses a **public-source, proprietary/all-rights-reserved model**, not an open-source model.

Security is based on authentication, authorization, validation, deterministic domain rules, transactional persistence and server authority — never on hiding implementation details.
