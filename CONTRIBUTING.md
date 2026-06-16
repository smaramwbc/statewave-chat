# Contributing to statewave-chat

Thank you for your interest in contributing! This is part of the Statewave open-source ecosystem.

> **Issues & feature requests** are tracked centrally at [statewave/issues](https://github.com/smaramwbc/statewave/issues), not per-repo. If you're unsure where something belongs, open it there.

## Prerequisites

- Node.js ≥ 18
- pnpm ≥ 9 (`npm install -g pnpm`)
- A running Statewave server for integration testing ([quick start](https://github.com/smaramwbc/statewave-docs/blob/main/getting-started.md))

## Local setup

```bash
git clone https://github.com/smaramwbc/statewave-chat.git
cd statewave-chat
pnpm install
pnpm -r build        # build all packages (required before typechecking react/widget)
pnpm -r typecheck    # zero errors expected
pnpm -r test         # all tests must pass
```

## Repository structure

```
packages/
  core/     @statewavedev/chat-core   — framework-agnostic engine + server adapter
  react/    @statewavedev/chat-react  — React provider, hooks, components
  widget/   @statewavedev/chat-widget — drop-in component + vanilla JS mount
examples/                             — runnable examples (not published to npm)
docs/                                 — architecture and design docs
```

## Workflow

1. Fork the repository and create a feature branch from `main`.
2. Make your changes. Run the full check suite before opening a PR:
   ```bash
   pnpm -r typecheck
   pnpm -r lint
   pnpm -r test
   pnpm -r build
   ```
3. Add a changeset if your change affects a published package:
   ```bash
   pnpm changeset
   ```
4. Open a pull request against `main`. The PR template will guide you through what to fill in.

## Commit style

Use a plain imperative subject line:

```
feat(core): add per-subject timeout to retrieval config
fix(react): clear loading state on AbortError
docs: add architecture diagram to docs/architecture.md
```

No self-attribution trailers. No `Co-Authored-By` lines.

## Package-level conventions

### @statewavedev/chat-core

- No browser or Node.js specific globals in `src/` (except in `src/server/`, which is server-only).
- The `./server` export must never enter a browser bundle.
- Model output (citation IDs, answers) must never be trusted as a source of URLs, titles, or memory IDs. Those must always come from the retrieved context bundle.
- Every new public API needs a unit test.

### @statewavedev/chat-react

- All components are unstyled and accept `className` props. No built-in CSS.
- Source URLs from `ChatSource` must pass through `safeUrl()` before rendering as anchors.
- Components must be accessible: ARIA labels, `role` attributes, keyboard support.

### @statewavedev/chat-widget

- Keep it thin — composition only. Logic belongs in `chat-core` or `chat-react`.
- `mountStatewaveChat()` must work in a plain HTML page without a build step.

## Security

If you find a security vulnerability, please **do not** open a public issue. Email [security@statewave.ai](mailto:security@statewave.ai) instead. See [SECURITY.md](SECURITY.md) for the full policy.

## License

By contributing, you agree that your contributions will be licensed under the [Apache-2.0 License](LICENSE).
