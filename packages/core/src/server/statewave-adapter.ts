/**
 * Server-side Statewave adapter for @statewavedev/chat-core.
 *
 * This adapter uses the @statewavedev/sdk directly and MUST only be
 * imported in server-side code (Node.js, edge functions, Next.js server
 * components, etc.). It must never be bundled into browser code.
 *
 * SECURITY:
 * - The Statewave API key is never exposed to the browser.
 * - Subjects must be validated by the caller before passing to retrieve().
 * - The LLM API key is never forwarded to the client.
 * - Retrieved memories are treated as untrusted data: passed through the
 *   prompt injection barrier in buildSystemPrompt() before being sent to
 *   the model.
 *
 * LLM integration:
 * This adapter is LLM-agnostic. The caller must provide a completionFn
 * that calls their LLM endpoint. This keeps the core package free of
 * provider-specific SDK dependencies.
 */

import type {
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
} from "../adapter.js";
import type { ChatContextBundle, ChatContextItem, ChatMessage, SubjectWarning } from "../types.js";
import { normalizeSource } from "../sources.js";
import { buildSystemPrompt, parseStructuredCompletion } from "../prompt.js";
import { perSubjectAllowance } from "../budget.js";
import { ChatCoreError } from "../errors.js";

// ---------------------------------------------------------------------------
// Statewave SDK type stubs
// These will be replaced by imports from @statewavedev/sdk when that package
// adds the necessary exports. Using structural types avoids a hard dev-dep cycle
// while statewave-ts PR #24 (AbortSignal) is in review.
// ---------------------------------------------------------------------------

interface StatewaveSDKClient {
  getContext(
    params: { subjectId: string; task: string; maxTokens?: number },
    options?: { signal?: AbortSignal },
  ): Promise<StatewaveContextResponse>;
  createEpisode(
    params: {
      subjectId: string;
      kind: string;
      text: string;
      metadata?: Record<string, unknown>;
      source?: { type: string; id: string; url?: string };
    },
    options?: { signal?: AbortSignal },
  ): Promise<{ id: string }>;
}

interface StatewaveContextResponse {
  memories?: StatewaveMemoryItem[];
  episodes?: StatewaveEpisodeItem[];
  totalTokens?: number;
}

interface StatewaveMemoryItem {
  id: string;
  subject: string;
  text: string;
  score?: number;
  tokenCount?: number;
  createdAt?: string;
  validFrom?: string;
  validTo?: string | null;
  status?: string;
  claimKey?: string;
  entityKey?: string;
  qualifiers?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  episodes?: StatewaveEpisodeItem[];
}

interface StatewaveEpisodeItem {
  id: string;
  subject: string;
  text: string;
  score?: number;
  tokenCount?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  source?: { type: string; id: string; url?: string };
}

// ---------------------------------------------------------------------------
// LLM completion function type
// ---------------------------------------------------------------------------

/**
 * Caller-provided LLM function. Receives the built messages and must return
 * the raw string response from the model.
 *
 * The model is expected to respond with JSON matching the StructuredChatCompletion
 * schema. The adapter handles parsing and validation.
 */
export type LLMCompletionFn = (
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: { signal?: AbortSignal },
) => Promise<{ content: string; model?: string; durationMs?: number }>;

// ---------------------------------------------------------------------------
// Retrieval adapter
// ---------------------------------------------------------------------------

export class StatewaveRetrievalAdapter implements ChatRetrievalAdapter {
  constructor(private readonly client: StatewaveSDKClient) {}

  async retrieve(
    request: ChatRetrievalRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ChatContextBundle> {
    const { readSubjects, task, config } = request;
    const signal = options?.signal;

    const subject = readSubjects[0];
    if (!subject) {
      return { items: [], totalTokens: 0, successfulSubjects: [], subjectWarnings: [] };
    }

    const allowance = perSubjectAllowance(config, readSubjects.length);
    const warnings: SubjectWarning[] = [];

    let response: StatewaveContextResponse;
    try {
      response = await this.client.getContext(
        { subjectId: subject, task, maxTokens: allowance },
        { signal },
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      warnings.push({ subject, reason: "upstream_error", detail: err instanceof Error ? err.message : String(err) });
      return { items: [], totalTokens: 0, successfulSubjects: [], subjectWarnings: warnings };
    }

    const items = buildContextItems(subject, response);
    const totalTokens = items.reduce(
      (sum, item) => sum + (item.tokenCount ?? Math.ceil(item.content.length / 4)),
      0,
    );

    return {
      items,
      totalTokens,
      successfulSubjects: [subject],
      subjectWarnings: warnings,
    };
  }
}

function buildContextItems(subject: string, response: StatewaveContextResponse): ChatContextItem[] {
  const items: ChatContextItem[] = [];
  let seq = 1;

  for (const mem of response.memories ?? []) {
    items.push({
      id: `S${seq++}`,
      subject,
      content: mem.text,
      memoryId: mem.id,
      score: mem.score,
      tokenCount: mem.tokenCount,
      createdAt: mem.createdAt,
      validFrom: mem.validFrom,
      validTo: mem.validTo,
      status: (mem.status as ChatContextItem["status"]) ?? "active",
      claimKey: mem.claimKey,
      entityKey: mem.entityKey,
      qualifiers: mem.qualifiers,
      metadata: mem.metadata,
      source: normalizeSource(
        undefined,
        mem.metadata,
      ),
    });
  }

  for (const ep of response.episodes ?? []) {
    items.push({
      id: `S${seq++}`,
      subject,
      content: ep.text,
      episodeId: ep.id,
      score: ep.score,
      tokenCount: ep.tokenCount,
      createdAt: ep.createdAt,
      metadata: ep.metadata,
      source: normalizeSource(ep.source, ep.metadata),
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Completion adapter
// ---------------------------------------------------------------------------

export class StatewaveCompletionAdapter implements ChatCompletionAdapter {
  constructor(private readonly completionFn: LLMCompletionFn) {}

  async complete(
    request: ChatCompletionRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ChatCompletionResult> {
    const { messages, context, answerPolicy, sessionId: _sessionId } = request;
    const signal = options?.signal;

    const systemPrompt = buildSystemPrompt(answerPolicy, context);

    // Build the message array: system + history
    const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let result: { content: string; model?: string; durationMs?: number };
    try {
      result = await this.completionFn(llmMessages, { signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      throw new ChatCoreError("completion_failed", err instanceof Error ? err.message : String(err), {
        cause: err,
      });
    }

    const parsed = parseStructuredCompletion(result.content);

    return {
      completion: {
        answer: parsed.answer,
        grounded: parsed.grounded,
        citationIds: parsed.citationIds,
      },
      model: result.model,
      durationMs: result.durationMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Persistence adapter
// ---------------------------------------------------------------------------

export class StatewavePersistenceAdapter implements ChatPersistenceAdapter {
  constructor(private readonly client: StatewaveSDKClient) {}

  async persistTurn(
    request: PersistChatTurnRequest,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { writeSubject, sessionId, messages } = request;
    const signal = options?.signal;

    for (const message of messages) {
      if (message.role === "user" || message.role === "assistant") {
        await this.persistMessage(writeSubject, sessionId, message, signal);
      }
    }
  }

  private async persistMessage(
    writeSubject: string,
    sessionId: string,
    message: ChatMessage,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.client.createEpisode(
      {
        subjectId: writeSubject,
        kind: "chat.message",
        text: `[${message.role}] ${message.content}`,
        metadata: {
          sessionId,
          role: message.role,
          messageId: message.id,
          createdAt: message.createdAt,
          grounded: message.grounded,
          citationCount: message.citations?.length ?? 0,
        },
      },
      { signal },
    );
  }
}

// ---------------------------------------------------------------------------
// Suggested questions adapter
// ---------------------------------------------------------------------------

export class StatewaveSuggestedQuestionsAdapter implements SuggestedQuestionsAdapter {
  constructor(
    private readonly completionFn: LLMCompletionFn,
    private readonly client: StatewaveSDKClient,
  ) {}

  async suggest(
    request: SuggestedQuestionsRequest,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { readSubjects, limit = 3 } = request;
    const signal = options?.signal;

    const subject = readSubjects[0];
    if (!subject) return [];

    let context: StatewaveContextResponse;
    try {
      context = await this.client.getContext(
        { subjectId: subject, task: "generate suggested questions", maxTokens: 512 },
        { signal },
      );
    } catch {
      return [];
    }

    const snippet = (context.memories ?? [])
      .slice(0, 3)
      .map((m) => m.text.slice(0, 200))
      .join("\n---\n");

    const prompt = `Based on this knowledge base content, suggest ${limit} concise, natural questions a user might ask. Return only a JSON array of strings. No explanation.

Content snippet:
${snippet}`;

    try {
      const result = await this.completionFn(
        [{ role: "user", content: prompt }],
        { signal },
      );
      const parsed = JSON.parse(result.content);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .slice(0, limit);
      }
    } catch {
      // Suggestion failure is non-fatal
    }

    return [];
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface StatewaveChatAdapterOptions {
  client: StatewaveSDKClient;
  completionFn: LLMCompletionFn;
  /** Enable conversation persistence to Statewave memory. Default: false. */
  enablePersistence?: boolean;
  /** Enable suggested questions. Default: false. */
  enableSuggestedQuestions?: boolean;
}

/**
 * Create a fully wired ChatAdapter using a Statewave SDK client and a caller-
 * provided LLM completion function.
 *
 * Usage (server-side only):
 *
 *   import { StatewaveClient } from "@statewavedev/sdk";
 *   import { createStatewaveChatAdapter } from "@statewavedev/chat-core/server";
 *
 *   const client = new StatewaveClient({ apiKey: process.env.STATEWAVE_API_KEY });
 *   const adapter = createStatewaveChatAdapter({
 *     client,
 *     completionFn: async (messages, opts) => {
 *       const resp = await openai.chat.completions.create({
 *         model: "gpt-4o",
 *         messages,
 *         signal: opts?.signal,
 *       });
 *       return { content: resp.choices[0].message.content ?? "" };
 *     },
 *   });
 */
export function createStatewaveChatAdapter(options: StatewaveChatAdapterOptions): ChatAdapter {
  const { client, completionFn, enablePersistence = false, enableSuggestedQuestions = false } =
    options;

  const adapter: ChatAdapter = {
    retrieval: new StatewaveRetrievalAdapter(client),
    completion: new StatewaveCompletionAdapter(completionFn),
  };

  if (enablePersistence) {
    adapter.persistence = new StatewavePersistenceAdapter(client);
  }

  if (enableSuggestedQuestions) {
    adapter.suggestedQuestions = new StatewaveSuggestedQuestionsAdapter(completionFn, client);
  }

  return adapter;
}
