/**
 * @statewavedev/chat-core — public API
 *
 * This package is framework-agnostic and has no browser or Node.js
 * specific imports. It is safe to import in any environment.
 *
 * For the server-side Statewave adapter, import from:
 *   @statewavedev/chat-core/server
 */

// Types
export type {
  ChatAnswerPolicy,
  ChatCitation,
  ChatContextBundle,
  ChatContextItem,
  ChatError,
  ChatErrorCode,
  ChatMessage,
  ChatMessageStatus,
  ChatRole,
  ChatSession,
  ChatSource,
  MultiSubjectRetrievalConfig,
  StructuredChatCompletion,
  SubjectWarning,
} from "./types.js";
export { DEFAULT_ANSWER_POLICY } from "./types.js";

// Adapter interfaces
export type {
  ChatAdapter,
  ChatCompletionAdapter,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatPersistenceAdapter,
  ChatRetrievalAdapter,
  ChatRetrievalRequest,
  PersistChatTurnRequest,
  SuggestedQuestionsAdapter,
  SuggestedQuestionsRequest,
} from "./adapter.js";

// Engine
export type {
  ChatEngineConfig,
  SendMessageOptions,
  SendMessageResult,
} from "./engine.js";
export { sendMessage } from "./engine.js";

// Budget
export type {
  MultiSubjectResults,
  SubjectRetrievalResult,
} from "./budget.js";
export {
  mergeSubjectResults,
  perSubjectAllowance,
  validateSubjectConfig,
} from "./budget.js";

// Prompt
export type { ParsedCompletion, PromptMessages } from "./prompt.js";
export { buildSystemPrompt, parseStructuredCompletion } from "./prompt.js";

// Citations
export type { CitationValidationResult } from "./citations.js";
export { assessGrounding, validateCitations } from "./citations.js";

// Sources
export type { ConnectorSourcePointer, RawEpisodeSource } from "./sources.js";
export { normalizeSource, sourceProviderLabel } from "./sources.js";

// Errors
export { ChatCoreError } from "./errors.js";

// Retry
export type { RetryOptions } from "./retry.js";
export { fetchWithRetry } from "./retry.js";
