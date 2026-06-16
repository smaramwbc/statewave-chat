/**
 * Server-only exports for @statewavedev/chat-core/server.
 *
 * Import from this subpath only in server-side code:
 *   import { createStatewaveChatAdapter } from "@statewavedev/chat-core/server"
 *
 * Never import this in browser bundles. The Statewave API key and LLM API
 * key must never be exposed to the client.
 */

export type { LLMCompletionFn, StatewaveChatAdapterOptions } from "./statewave-adapter.js";
export {
  createStatewaveChatAdapter,
  StatewaveCompletionAdapter,
  StatewavePersistenceAdapter,
  StatewaveRetrievalAdapter,
  StatewaveSuggestedQuestionsAdapter,
} from "./statewave-adapter.js";
