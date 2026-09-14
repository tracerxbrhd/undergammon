# 30. CI, Testing, and Repository Workflow

## Status

Accepted for the UNDERGAMMON Season 0 development baseline.

## Repository workflow

UNDERGAMMON is primarily a solo-developed project. Pull requests are the preferred workflow for substantial changes, reviewable Codex tasks, risky migrations, and all external contributions, but the repository owner is not prohibited from pushing directly to `main`.

The goal is to keep engineering discipline without imposing unnecessary process overhead on the primary developer.

### Direct pushes

The repository owner may push directly to `main` when appropriate.

Direct push is suitable for small documentation changes, low-risk maintenance, trivial configuration corrections, and other narrowly scoped changes where a pull request would add little value.

Larger or riskier work should normally use a branch and pull request so that CI results, the diff, and review context remain easy to inspect.

External contributors must use pull requests.

## Continuous integration

CI runs automatically for pull requests and for pushes to `main`.

The baseline pipeline should include:

- dependency installation with the locked pnpm version;
- formatting verification;
- linting;
- strict TypeScript type checking;
- unit tests;
- game-engine regression tests;
- game-engine property-based and determinism tests;
- backend integration tests that require PostgreSQL;
- production builds for deployable applications and shared packages.

A failed CI run on `main` is treated as a defect to fix promptly, but it does not technically prevent the owner from performing an emergency direct change.

## Game-engine quality gate

`packages/game-engine` has a higher correctness requirement than ordinary UI code.

Any modification that can affect legal moves, turn completion, dice consumption, bearing off, hitting, blocking, opening rules, result classification, or another game rule must be covered by deterministic regression tests.

Property-based tests should enforce invariants where practical, including preservation of checker counts, deterministic transitions for identical inputs, legal dice consumption, and impossibility of invalid board states through accepted engine actions.

Legacy tests from `tracerxbrhd/backgammon` may be reused as regression references after their assumptions are checked against the new UNDERGAMMON rules specification.

## Test layers

### Unit tests

Used for pure domain functions, rating calculations, XP/economy calculations, validation, and other isolated logic.

### Property-based tests

Primarily used for the deterministic game engine and rule invariants.

### Integration tests

Used for database transactions, authentication boundaries, matchmaking concurrency, match completion, rating/economy atomicity, and HTTP/WebSocket server behavior.

PostgreSQL integration tests should use an isolated disposable database environment rather than mocks for persistence-critical behavior.

### End-to-end tests

Browser-level automated tests may cover stable Mini App flows where valuable, but Season 0 release still requires the previously defined real-device Android Telegram versus iPhone Telegram acceptance pass.

Automated browser tests do not replace that release gate.

## Merge strategy

Squash merge is the preferred pull-request merge strategy because engineering tasks are intended to be small, independently reviewable changes.

Merge commits or rebases remain available when they are more appropriate; the project does not require an artificial single strategy for every case.

## Dependency and repository hygiene

The repository should maintain:

- a committed pnpm lockfile;
- automated dependency update visibility;
- dependency/security scanning appropriate for a public repository;
- no committed production credentials or user data;
- reproducible Docker and CI builds;
- explicit Node.js and package-manager versions.

## Production deployment

CI and deployment are separate concerns.

Passing CI never automatically deploys production. Production deployment remains a manually triggered GitHub Actions workflow as defined in the hosting and deployment architecture.

## Guiding principle

UNDERGAMMON should have enough automated verification that game-rule and persistence regressions are difficult to introduce accidentally, while repository process remains lightweight enough for efficient solo development.
