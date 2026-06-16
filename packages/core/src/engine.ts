/**
 * Headless chat session state machine for @statewavedev/chat-core.
 *
 * The engine orchestrates one full chat turn:
 * 1. Retrieve context from read subjects (parallel, concurrency-limited).
 * 2. Build a grounded prompt and call the completion adapter.
 * 3. Validate citations (model MUST only return S1/S2/... IDs).
 * 4. Optionally persist the turn to the writeSubject.
 * 5. Return a fully typed ChatMessage with citations and session state.
 *
 * Read/Write subject isolation:
 * - readSubjects are never written to.
 * - writeSubject receives only the conversation turn, never the retrieved context.
 * - When persistence is enabled, subsequent turns include writeSubject in readSubjects
 *   so the conversation can recall itself.
 *
 * Failure modes:
 * - "strict": any subject retrieval failure aborts the request.
 * - "partial": returns what succeeded with SubjectWarning entries.
 * - Auth/cross-tenant failures are always strict regardless of config.
 *
 * AbortSignal:
 * All async operations are cancellable. An AbortError propagates immediately
 * and produces a ChatMessage with status "error" and code "aborted".
 */

import { assessGrounding, validateCitations } from "./citations.js";
import { ChatCoreError } from "./errors.js";
import { buildSystemPrompt, parseStructuredCompletion } from "./prompt.js";
import { perSubjectAllowance, validateSubjectConfig } from "./budget.js";
import type {
  ChatAdapter,
  ChatCompletionRequest,
  ChatRetrievalRequest,
} from "./adapter.js";
import type {
  ChatAnswerPolicy,
  ChatContextBundle,
  ChatErrorCode,
  ChatMessage,
  ChatSession,
  MultiSubjectRetrievalConfig,
  SubjectWarning,
} from "./types.js";
import { DEFAULT_ANSWER_POLICY } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ChatEngineConfig {
  adapter: ChatAdapter;
  retrievalConfig: MultiSubjectRetrievalConfig;
  answerPolicy?: ChatAnswerPolicy;
}

export interface SendMessageOptions {
  signal?: AbortSignal;
}

export interface SendMessageResult {
  session: ChatSession;
  assistantMessage: ChatMessage;
}

/**
 * Process a single user turn within the given session.
 * Returns an updated session and the generated assistant message.
 */
export async function sendMessage(
  session: ChatSession,
  userContent: string,
  config: ChatEngineConfig,
  options?: SendMessageOptions,
): Promise<SendMessageResult> {
  const signal = options?.signal;
  const policy = config.answerPolicy ?? DEFAULT_ANSWER_POLICY;

  // Build the effective readSubjects list.
  // When persist is enabled, the writeSubject is appended so the conversation
  // recalls itself on subsequent turns — but only AFTER at least one prior turn.
  const effectiveReadSubjects = buildReadSubjects(session);

  validateSubjectConfig(effectiveReadSubjects, config.retrievalConfig);

  // Add user message to session
  const userMessage = makeMessage("user", userContent);
  const sessionWithUser: ChatSession = {
    ...session,
    messages: [...session.messages, userMessage],
    isLoading: true,
  };

  // Retrieve context from all subjects concurrently
  let contextBundle: ChatContextBundle;
  try {
    contextBundle = await retrieveContext(
      effectiveReadSubjects,
      userContent,
      session.id,
      config,
      signal,
    );
  } catch (err) {
    if (isAbortError(err)) {
      return abortedResult(sessionWithUser, userMessage.id);
    }
    const errorMessage = makeErrorMessage("retrieval_failed", errorDetail(err));
    return {
      session: { ...sessionWithUser, isLoading: false },
      assistantMessage: errorMessage,
    };
  }

  // Build conversation history for the prompt
  const history = sessionWithUser.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Call completion adapter
  const completionRequest: ChatCompletionRequest = {
    messages: history,
    context: contextBundle,
    answerPolicy: policy,
    sessionId: session.id,
  };

  let rawAnswer: string;
  let completionModel: string | undefined;
  try {
    const result = await config.adapter.completion.complete(completionRequest, { signal });
    rawAnswer = result.completion.answer;
    completionModel = result.model;
  } catch (err) {
    if (isAbortError(err)) {
      return abortedResult(sessionWithUser, userMessage.id);
    }
    const errorMessage = makeErrorMessage("completion_failed", errorDetail(err));
    return {
      session: { ...sessionWithUser, isLoading: false, contextBundle },
      assistantMessage: errorMessage,
    };
  }

  // Parse and validate the structured completion
  const parsed = parseStructuredCompletion(rawAnswer);

  if (parsed.parseWarning === "invalid_json") {
    const errorMessage = makeErrorMessage("invalid_json", "Model returned non-JSON response");
    return {
      session: { ...sessionWithUser, isLoading: false, contextBundle },
      assistantMessage: errorMessage,
    };
  }
  if (parsed.parseWarning === "invalid_schema") {
    const errorMessage = makeErrorMessage("invalid_schema", "Model response did not match the expected schema");
    return {
      session: { ...sessionWithUser, isLoading: false, contextBundle },
      assistantMessage: errorMessage,
    };
  }
  if (parsed.parseWarning === "empty_answer") {
    const errorMessage = makeErrorMessage("empty_answer", "Model returned an empty answer");
    return {
      session: { ...sessionWithUser, isLoading: false, contextBundle },
      assistantMessage: errorMessage,
    };
  }

  // Validate citation IDs
  const { validCitations, unknownIds, hasUnknown } = validateCitations(
    parsed.citationIds,
    contextBundle.items,
  );

  // Assess grounding consistency
  const { effectivelyGrounded, contradiction } = assessGrounding(
    parsed.grounded,
    parsed.citationIds,
    validCitations.length,
    policy.requireCitations,
  );

  // Build assistant message
  const assistantMessage: ChatMessage = {
    id: generateId(),
    role: "assistant",
    content: parsed.answer,
    createdAt: new Date().toISOString(),
    grounded: effectivelyGrounded,
    citations: validCitations,
    status: "complete",
  };

  if (hasUnknown) {
    assistantMessage.error = {
      code: "unknown_citation_ids",
      message: `Model returned unknown citation IDs: ${unknownIds.join(", ")}`,
      warning: true,
      unknownCitationIds: unknownIds,
    };
  } else if (contradiction) {
    assistantMessage.error = {
      code: "contradictory_grounded",
      message: "Model claimed grounded but provided no valid citations",
      warning: true,
    };
  }

  // Optionally persist the conversation turn
  if (session.persist && session.writeSubject && config.adapter.persistence) {
    try {
      await config.adapter.persistence.persistTurn(
        {
          writeSubject: session.writeSubject,
          sessionId: session.id,
          messages: [userMessage, assistantMessage],
        },
        { signal },
      );
    } catch (err) {
      if (isAbortError(err)) {
        return abortedResult(sessionWithUser, userMessage.id);
      }
      // Persistence failure is a warning — the answer is still valid
      if (!assistantMessage.error) {
        assistantMessage.error = {
          code: "persistence_failed",
          message: errorDetail(err),
          warning: true,
        };
      }
    }
  }

  // Build next session state
  const nextSession: ChatSession = {
    ...sessionWithUser,
    messages: [...sessionWithUser.messages, assistantMessage],
    contextBundle,
    isLoading: false,
  };

  // On first successful persist, append writeSubject to readSubjects
  if (
    session.persist &&
    session.writeSubject &&
    !session.readSubjects.includes(session.writeSubject)
  ) {
    nextSession.readSubjects = [...nextSession.readSubjects, session.writeSubject];
  }

  void completionModel; // used for future debug metadata

  return { session: nextSession, assistantMessage };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildReadSubjects(session: ChatSession): string[] {
  // writeSubject is only appended after the first turn so an empty session
  // doesn't try to retrieve from a non-existent conversation subject
  const hasPriorTurns = session.messages.some((m) => m.role === "assistant");
  if (
    session.persist &&
    session.writeSubject &&
    hasPriorTurns &&
    !session.readSubjects.includes(session.writeSubject)
  ) {
    return [...session.readSubjects, session.writeSubject];
  }
  return session.readSubjects;
}

async function retrieveContext(
  readSubjects: string[],
  task: string,
  sessionId: string,
  config: ChatEngineConfig,
  signal?: AbortSignal,
): Promise<ChatContextBundle> {
  const retrievalConfig = config.retrievalConfig;
  const subjectCount = readSubjects.length;
  const allowance = perSubjectAllowance(retrievalConfig, subjectCount);
  const limit = retrievalConfig.concurrencyLimit ?? 5;
  const timeoutMs = retrievalConfig.perSubjectTimeoutMs ?? 10_000;
  const failureMode = retrievalConfig.failureMode ?? "strict";

  // Per-subject config slice used by the adapter
  const perSubjectConfig: MultiSubjectRetrievalConfig = {
    ...retrievalConfig,
    globalMaxTokens: allowance,
    maxSubjects: 1,
  };

  // Concurrency-limited parallel retrieval
  const results = await concurrentMap(
    readSubjects,
    async (subject) => {
      const request: ChatRetrievalRequest = {
        readSubjects: [subject],
        task,
        sessionId,
        config: perSubjectConfig,
      };
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      const chainedSignal = chainAbort([signal, ac.signal]);
      try {
        const bundle = await config.adapter.retrieval.retrieve(request, {
          signal: chainedSignal,
        });
        return { subject, ok: true as const, bundle };
      } catch (err) {
        clearTimeout(timer);
        if (isAbortError(err) && signal?.aborted) throw err;
        const reason = classifyRetrievalError(err);
        return { subject, ok: false as const, reason, err };
      } finally {
        clearTimeout(timer);
      }
    },
    limit,
  );

  const successful = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0) {
    const warnings: SubjectWarning[] = failed.map((r) => ({
      subject: r.subject,
      reason: r.ok ? "unknown" : r.reason,
    }));

    if (failureMode === "strict") {
      throw new ChatCoreError("retrieval_failed", `${failed.length} subject(s) failed retrieval`, {
        subjectWarnings: warnings,
      });
    }
  }

  if (successful.length === 0) {
    return {
      items: [],
      totalTokens: 0,
      successfulSubjects: [],
      subjectWarnings: failed.map((r) => ({
        subject: r.subject,
        reason: r.ok ? "unknown" : r.reason,
      })),
    };
  }

  // Merge all successful bundles — items already have S1..SN IDs from the adapter
  // or are merged here using the budget module via the retrieval adapter
  const allItems = successful.flatMap((r) => (r.ok ? r.bundle.items : []));
  const totalTokens = allItems.reduce((sum, item) => sum + (item.tokenCount ?? Math.ceil(item.content.length / 4)), 0);
  const successfulSubjects = successful.map((r) => r.subject);
  const subjectWarnings: SubjectWarning[] = failed.map((r) => ({
    subject: r.subject,
    reason: r.ok ? "unknown" : r.reason,
  }));

  // Re-assign S1..SN IDs deterministically after merge
  const reIndexed = allItems.map((item, i) => ({ ...item, id: `S${i + 1}` }));

  return {
    items: reIndexed,
    totalTokens: Math.min(totalTokens, retrievalConfig.globalMaxTokens),
    successfulSubjects,
    subjectWarnings,
  };
}

function classifyRetrievalError(err: unknown): SubjectWarning["reason"] {
  if (err instanceof ChatCoreError) {
    if (err.code === "unauthorized") return "unauthorized";
    return "upstream_error";
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
    if (msg.includes("unauthorized") || msg.includes("403") || msg.includes("401")) return "unauthorized";
    if (msg.includes("not found") || msg.includes("404")) return "not_found";
  }
  return "upstream_error";
}

async function concurrentMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const queue = items.map((item, i) => ({ item, i }));
  let idx = 0;

  async function worker(): Promise<void> {
    while (idx < queue.length) {
      const { item, i } = queue[idx++];
      results[i] = await fn(item);
    }
  }

  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(concurrency, items.length); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

function chainAbort(signals: (AbortSignal | undefined)[]): AbortSignal {
  const ac = new AbortController();
  for (const sig of signals) {
    if (!sig) continue;
    if (sig.aborted) { ac.abort(); break; }
    sig.addEventListener("abort", () => ac.abort(), { once: true });
  }
  return ac.signal;
}

function makeMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: generateId(),
    role,
    content,
    createdAt: new Date().toISOString(),
    status: "complete",
  };
}

function makeErrorMessage(code: ChatErrorCode, message: string): ChatMessage {
  return {
    id: generateId(),
    role: "assistant",
    content: "",
    createdAt: new Date().toISOString(),
    status: "error",
    error: { code, message },
  };
}

function abortedResult(session: ChatSession, _userMessageId: string): SendMessageResult {
  const msg: ChatMessage = {
    id: generateId(),
    role: "assistant",
    content: "",
    createdAt: new Date().toISOString(),
    status: "error",
    error: { code: "aborted", message: "Request was cancelled" },
  };
  return {
    session: { ...session, isLoading: false },
    assistantMessage: msg,
  };
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function errorDetail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

let _seq = 0;
function generateId(): string {
  _seq = (_seq + 1) % 1_000_000;
  return `msg_${Date.now().toString(36)}_${_seq.toString(36).padStart(4, "0")}`;
}

// Re-export buildSystemPrompt so the server adapter can use it directly
export { buildSystemPrompt };
