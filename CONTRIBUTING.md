# Contributing

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

## Packages

- `packages/core` — `@statewavedev/chat-core`
- `packages/react` — `@statewavedev/chat-react`
- `packages/widget` — `@statewavedev/chat-widget`

## Workflow

1. Fork and create a feature branch.
2. Run `pnpm typecheck && pnpm lint && pnpm test` before opening a PR.
3. Use [Changesets](https://github.com/changesets/changesets) for version bumps: `pnpm changeset`.

## Commit style

Plain imperative subject line. No self-attribution trailers.

## Memory dogfooding

This repository uses Statewave memory for its own project brain.
See `AGENTS.md` for the conventions applied to this workspace.
