# @statewavedev/chat-core

## 0.1.2

### Patch Changes

- 883c676: Fix StatewaveRetrievalAdapter to match real SDK ContextBundle shape

  The internal stub expected `response.memories` but the SDK returns `response.facts` + `response.procedures`, causing retrieve() to always return 0 items. Also fixes `mem.content` (was `mem.text`), `mem.subjectId` (was `mem.subject`), and updates StatewavePersistenceAdapter.createEpisode to use `type`/`payload:{text}` instead of `kind`/`text`.

  Fix buildSystemPrompt to respect groundedOnly=false so the model can answer from general knowledge when evidence is insufficient, instead of always returning the insufficientContextMessage.

## 0.1.0

### Minor Changes

Initial release. Headless chat engine for Statewave-powered applications.

- Multi-subject context retrieval with global token budget and round-robin interleave
- Structured grounded completion with JSON schema enforcement
- Citation validation: model returns only IDs (`S1`, `S2`, …); source metadata resolved server-side from context bundle
- Prompt injection barrier: retrieved evidence framed separately from system instructions
- AbortSignal cancellation throughout the retrieval–completion–persistence pipeline
- `createStatewaveChatAdapter` (server-only, `@statewavedev/chat-core/server`) for wiring Statewave API keys server-side
