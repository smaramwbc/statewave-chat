---
"@statewavedev/chat-core": patch
---

Fix StatewaveRetrievalAdapter to match real SDK ContextBundle shape

The internal stub expected `response.memories` but the SDK returns `response.facts` + `response.procedures`, causing retrieve() to always return 0 items. Also fixes `mem.content` (was `mem.text`), `mem.subjectId` (was `mem.subject`), and updates StatewavePersistenceAdapter.createEpisode to use `type`/`payload:{text}` instead of `kind`/`text`.

Fix buildSystemPrompt to respect groundedOnly=false so the model can answer from general knowledge when evidence is insufficient, instead of always returning the insufficientContextMessage.
