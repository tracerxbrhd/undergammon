# 17. Telemetry and Feedback

## Status
Accepted for Season 0 / first public release.

## Goals
- Collect only the operational and product data needed to evaluate game quality, matchmaking, progression and economy.
- Keep the first release simple: no dedicated analytics dashboard, no external crash-reporting platform, no built-in ticket system.
- Preserve enough structured technical data to investigate concrete player-reported incidents.

## Product telemetry
Season 0 includes basic server-side telemetry. Useful event categories include:

- account creation;
- match start/completion and finish reason;
- matchmaking queue duration;
- challenge creation/acceptance;
- disconnect/reconnect events;
- daily reward claims;
- Coins earned/spent;
- XP earned;
- ruleset/mode activity.

The telemetry exists for quality, balance and operational decisions, not advertising or marketing profiling.

## Server logs
Structured backend logs are mandatory even though automated crash reporting is deferred.

Logs should cover at least:

- authentication failures;
- match lifecycle/state transitions;
- WebSocket connect/disconnect/reconnect;
- rejected game commands;
- server exceptions;
- match finish reason;
- administrative actions.

Where useful, events should include stable technical identifiers such as `matchId`, `accountId`, timestamp and event type.

Sensitive values must not be logged. In particular, do not log raw Telegram `initData`, secrets, tokens, credentials or unnecessary personal data.

## Crash and error reporting
No Sentry-like automatic client/server crash-reporting service is required for Season 0.

Critical problems are expected to be reported manually by testers/users. Structured backend logs and match/account identifiers must provide enough context to investigate those reports.

This does not prohibit adding centralized error reporting later if the user base or support load justifies it.

## Analytics dashboard
No analytics dashboard is implemented in Season 0.

Required data should be queryable from PostgreSQL and structured logs. The event/data model should remain sufficiently explicit that a dashboard or observability/product-analytics system can be added later without redesigning the core game backend.

Potential future metrics include:

- total and completed matches;
- completion/abandon/timeout rates;
- matchmaking wait times;
- reconnect frequency;
- rating distribution;
- XP and Coins economy flows;
- activity by ruleset and mode.

## Tester feedback
Season 0 uses manual feedback rather than an in-product issue/ticket system.

There is no dedicated bug-report form in the first release. A future `Feedback` entry may route users to an appropriate Telegram support/channel flow if needed.

## Non-goals for Season 0
- marketing/ad tracking;
- user behavior profiling beyond product/technical telemetry;
- dedicated analytics UI;
- third-party crash-reporting infrastructure;
- in-product bug tracking/ticketing.
