# Copilot / AI agent instructions for `statewave-chat`

These conventions should be followed when generating or modifying code in this
repository. They reflect deliberate architecture decisions, not stylistic
preferences.

---

## Package structure

`statewave-chat` is a monorepo containing three packages:

- `packages/chat-core` — framework-agnostic session and memory logic
- `packages/chat-react` — React hooks and context built on `chat-core`
- `packages/chat-widget` — drop-in `<ChatWidget>` component built on `chat-react`

Always respect the dependency direction: `chat-widget` → `chat-react` →
`chat-core`. Never introduce reverse or circular dependencies.

---

## Language: TypeScript only

All source files are TypeScript. Do not add `.js` files to `src/`. Every
public export must be fully typed — no implicit `any`.

---

## Testing

Each package has its own test suite under `packages/<pkg>/src/__tests__/`.
Run tests with `npm test` from the repo root (Vitest workspace).

---

## Statewave memory

<!-- statewave:begin (managed by `statewave-connectors mcp init`) -->
**Statewave memory** — MCP server `statewave`, subject `repo:smaramwbc.statewave-chat`.
Before answering questions about this project, call `statewave_get_context` (that subject, `query` = the ask) and ground your answer in it.
When the user states a durable fact or decision, call `statewave_ingest_episode` then `statewave_compile_subject` (same subject). Never invent Statewave results.
<!-- statewave:end -->
