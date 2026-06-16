/**
 * Adapter interfaces for @statewavedev/chat-core.
 *
 * These interfaces define the boundary between the headless chat engine and
 * the deployment-specific implementations. Different consumers supply
 * different adapters:
 *
 * - WebsiteChatAdapter   — calls /api/widget-chat (website-specific server route)
 * - AdminChatAdapter     — calls /api/admin-chat through the admin proxy
 * - ServerStatewaveAdapter — uses @statewavedev/sdk directly (server-only)
 * - ProxyChatAdapter     — calls a customer-controlled endpoint
 *
 * SECURITY: Adapters that call Statewave directly must run server-side only.
 * Never expose a Statewave or LLM API key in a browser adapter.
 */

import type {
  ChatAnswerPolicy,
  ChatContextBundle,
  ChatMessage,
  MultiSubjectRetrievalConfig,
  StructuredChatCompletion,
} from "./types.js";

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export interface ChatRetrievalRequest {
  readSubjects: string[];
  task: string;
  sessionId: string;
  config: MultiSubjectRetrievalConfig;
}

export interface ChatRetrievalAdapter {
  retrieve(
    request: ChatRetrievalRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ChatContextBundle>;
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

export interface ChatCompletionRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  context: ChatContextBundle;
  answerPolicy: ChatAnswerPolicy;
  sessionId: string;
}

export interface ChatCompletionResult {
  completion: StructuredChatCompletion;
  /** Model identifier actually used (for debug metadata). */
  model?: string;
  /** Duration of the completion call in milliseconds. */
  durationMs?: number;
}

export interface ChatCompletionAdapter {
  complete(
    request: ChatCompletionRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ChatCompletionResult>;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export interface PersistChatTurnRequest {
  writeSubject: string;
  sessionId: string;
  messages: ChatMessage[];
}

export interface ChatPersistenceAdapter {
  persistTurn(
    request: PersistChatTurnRequest,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

export interface SuggestedQuestionsRequest {
  readSubjects: string[];
  sessionId: string;
  /** Maximum number of suggestions to return. */
  limit?: number;
}

export interface SuggestedQuestionsAdapter {
  suggest(
    request: SuggestedQuestionsRequest,
    options?: { signal?: AbortSignal },
  ): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Combined adapter
// ---------------------------------------------------------------------------

/**
 * Combined adapter interface used by StatewaveChatProvider.
 * Implementations may satisfy subsets: persistence and suggested questions
 * are optional.
 */
export interface ChatAdapter {
  retrieval: ChatRetrievalAdapter;
  completion: ChatCompletionAdapter;
  persistence?: ChatPersistenceAdapter;
  suggestedQuestions?: SuggestedQuestionsAdapter;
}
