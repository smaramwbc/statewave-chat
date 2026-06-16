# Agents

This repository uses [Statewave](https://github.com/smaramwbc/statewave) for its own project memory.

## Memory subject

`workspace:statewave-chat`

## How connector data becomes chat knowledge

1. A connector ingests episodes into a subject (e.g. `docs:myapp`, `repo:owner/project`).
2. The Statewave compiler distils those episodes into typed memories.
3. `@statewavedev/chat-core` retrieves context from one or more read subjects.
4. The answer is grounded in that context; citations link back to the original source episodes.
5. Conversation turns are written only to an isolated write subject (`chat:<session-id>`), never into the authoritative read subjects.

## Package conventions

- `chat-core`: zero browser deps, no React, no Tailwind.
- `chat-react`: React peer dependency, CSS-variable styling, no hardcoded colors.
- `chat-widget`: thin composition layer; no duplicate state machines.
- Server-only modules export from `@statewavedev/chat-core/server` and must not enter browser bundles.

## Contributing agents

See `CONTRIBUTING.md`.
