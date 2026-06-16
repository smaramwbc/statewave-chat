# @statewavedev/chat-core

## 0.1.0

### Minor Changes

Initial release. Headless chat engine for Statewave-powered applications.

- Multi-subject context retrieval with global token budget and round-robin interleave
- Structured grounded completion with JSON schema enforcement
- Citation validation: model returns only IDs (`S1`, `S2`, …); source metadata resolved server-side from context bundle
- Prompt injection barrier: retrieved evidence framed separately from system instructions
- AbortSignal cancellation throughout the retrieval–completion–persistence pipeline
- `createStatewaveChatAdapter` (server-only, `@statewavedev/chat-core/server`) for wiring Statewave API keys server-side
