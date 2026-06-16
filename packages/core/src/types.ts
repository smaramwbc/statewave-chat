/**
 * Core chat types for @statewavedev/chat-core.
 *
 * These types are the canonical shapes for all statewave-chat consumers.
 * They are intentionally framework-independent and carry no React, browser,
 * or Node-only imports.
 *
 * Naming convention mirrors the Statewave SDK (camelCase public, snake_case
 * only on the wire inside the server adapter).
 */

// ---------------------------------------------------------------------------
// Source / provenance
// ---------------------------------------------------------------------------

/**
 * Generic connector source, preserved verbatim from the episode's top-level
 * `source` object. The `provider` field is derived from the episode `kind`
 * prefix (e.g. `"github"` from `"github.issue.opened"`) when the connector
 * does not supply it explicitly.
 *
 * Consumers must not depend on a closed set of known providers. Unknown
 * providers must render gracefully using `type`, `title`, or a generic icon.
 */
export interface ChatSource {
  /** Connector system (e.g. "github", "slack", "notion", "markdown"). Extensible string. */
  provider?: string;
  /** Entity type within the provider (e.g. "issue", "message", "page", "file"). */
  type?: string;
  /** Stable identifier within the source system (e.g. "owner/repo#42"). */
  id?: string;
  /** Human-readable title for the source item. */
  title?: string;
  /** Section or heading path within the document. */
  section?: string;
  /** Canonical permalink to the original source. Validated as a safe URL before rendering. */
  url?: string;
}

// ---------------------------------------------------------------------------
// Context items
// ---------------------------------------------------------------------------

/**
 * A single item from the Statewave context bundle, enriched with
 * connector provenance. Deterministic context IDs (S1, S2, …) are
 * assigned by the retrieval adapter after merging subjects.
 */
export interface ChatContextItem {
  /** Deterministic ID assigned during retrieval (e.g. "S1"). Used for citation validation. */
  id: string;
  /** The Statewave subject this item came from. */
  subject: string;
  /** The assembled text content included in the model prompt. */
  content: string;
  /** Statewave memory ID, when this item was compiled from episodes. */
  memoryId?: string;
  /** Statewave episode ID, when this item is a raw episode. */
  episodeId?: string;
  /** Relevance score returned by the server (subject-local, not cross-subject comparable). */
  score?: number;
  /** ISO-8601 timestamp when the underlying memory/episode was created. */
  createdAt?: string;
  /** Start of validity window (from Statewave memory). */
  validFrom?: string;
  /** End of validity window (null = no expiry). */
  validTo?: string | null;
  /** Whether this memory is currently active or has been superseded. */
  status?: "active" | "superseded" | "unknown";
  /** Stable fact key from the Statewave compiler. */
  claimKey?: string;
  /** Entity key from the Statewave compiler. */
  entityKey?: string;
  /** Additional qualifier fields from the compiler. */
  qualifiers?: Record<string, unknown>;
  /** Approximate token count for this item. */
  tokenCount?: number;
  /** Connector provenance (from episode source object + metadata). */
  source?: ChatSource;
  /** Additional metadata from the episode or memory. Not rendered to end users. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/**
 * A citation produced by the model and validated by the adapter.
 * Citation IDs (e.g. "S1") are validated against the actual retrieved
 * context before being surfaced to the UI. Unknown IDs are rejected.
 */
export interface ChatCitation {
  /** Citation ID as assigned by the adapter (e.g. "S1"). */
  id: string;
  /** The context item this citation refers to. */
  contextItemId: string;
  /** Optional short label for display. */
  label?: string;
  /** Subject the cited item came from. */
  subject: string;
  /** Statewave memory ID, if available. */
  memoryId?: string;
  /** Statewave episode ID, if available. */
  episodeId?: string;
  /** Source provenance for display. */
  source?: ChatSource;
}

// ---------------------------------------------------------------------------
// Context bundle
// ---------------------------------------------------------------------------

/**
 * The merged context bundle assembled from one or more Statewave subjects.
 * Context items have deterministic IDs assigned after subject-local retrieval
 * and cross-subject merging.
 *
 * IMPORTANT: relevance scores are subject-local (the server ranks within
 * each subject independently). Do not present these scores as cross-subject
 * global relevance ranking without additional normalization.
 */
export interface ChatContextBundle {
  /** All context items from all read subjects, in merge order. */
  items: ChatContextItem[];
  /** Total token count of all items. Always <= the configured global budget. */
  totalTokens: number;
  /** Which subjects succeeded in retrieval. */
  successfulSubjects: string[];
  /** Which subjects failed and why. */
  subjectWarnings: SubjectWarning[];
  /** Debug metadata, only populated when contextInspector is enabled. */
  debug?: {
    subjectCount: number;
    itemCount: number;
    retrievalDurationMs?: number;
  };
}

/** A warning about a subject that could not be fully retrieved. */
export interface SubjectWarning {
  subject: string;
  reason: "timeout" | "upstream_error" | "unauthorized" | "not_found" | "unknown";
  /** Human-readable detail. Must not contain information from the inaccessible subject. */
  detail?: string;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageStatus = "pending" | "streaming" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  citations?: ChatCitation[];
  /** True when the answer was grounded in the retrieved context. */
  grounded?: boolean;
  status?: ChatMessageStatus;
  /** Populated when status === "error". */
  error?: ChatError;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface ChatSession {
  id: string;
  /** Messages visible in the current conversation thread. */
  messages: ChatMessage[];
  /** Context bundle from the last retrieval. */
  contextBundle?: ChatContextBundle;
  /** Whether a request is in flight. */
  isLoading: boolean;
  /** Whether persistence is enabled for this session. */
  persist: boolean;
  /**
   * Subjects read in this session. When persistence is enabled, the
   * writeSubject is appended to readSubjects for subsequent turns so
   * the conversation remembers itself.
   */
  readSubjects: string[];
  /**
   * Subject used for writing conversation turns.
   * Undefined when persist === false.
   * Must follow the naming convention: chat:<id>, debug-chat:<id>, support-chat:<id>.
   */
  writeSubject?: string;
}

// ---------------------------------------------------------------------------
// Answer policy
// ---------------------------------------------------------------------------

export interface ChatAnswerPolicy {
  /**
   * When true, the adapter requests structured output with grounded/citationIds.
   * The completion is rejected if it cannot be validated.
   * When false, the model answer is returned as-is (no citation validation).
   */
  groundedOnly: boolean;
  /**
   * When true, at least one valid citation is required for a grounded answer.
   * Only meaningful when groundedOnly is true.
   */
  requireCitations: boolean;
  /** Returned to the user when the model cannot ground an answer. */
  insufficientContextMessage: string;
}

export const DEFAULT_ANSWER_POLICY: ChatAnswerPolicy = {
  groundedOnly: true,
  requireCitations: true,
  insufficientContextMessage:
    "I couldn't find enough information in the available sources to answer that.",
};

// ---------------------------------------------------------------------------
// Structured completion
// ---------------------------------------------------------------------------

/**
 * The structured output shape requested from the model.
 * Citation IDs refer to items in the retrieved ChatContextBundle.
 * The server/adapter resolves them back to full ChatCitation objects.
 * The model MUST NOT include source URLs, titles, or memory IDs — those
 * come exclusively from the server-side context bundle.
 */
export interface StructuredChatCompletion {
  answer: string;
  grounded: boolean;
  citationIds: string[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ChatErrorCode =
  | "retrieval_failed"
  | "completion_failed"
  | "completion_timeout"
  | "invalid_json"
  | "invalid_schema"
  | "unknown_citation_ids"
  | "contradictory_grounded"
  | "empty_answer"
  | "persistence_failed"
  | "rate_limited"
  | "unauthorized"
  | "partial_subject_failure"
  | "aborted"
  | "unknown";

export interface ChatError {
  code: ChatErrorCode;
  message: string;
  /** Warning-level: answer delivered but with caveats (e.g. persistence partial failure). */
  warning?: boolean;
  /** IDs of citation IDs the model returned that were not in the retrieved context. */
  unknownCitationIds?: string[];
  /** Which subjects failed (when code === "partial_subject_failure"). */
  subjectWarnings?: SubjectWarning[];
}

// ---------------------------------------------------------------------------
// Retrieval configuration
// ---------------------------------------------------------------------------

export interface MultiSubjectRetrievalConfig {
  /**
   * Maximum number of read subjects per request.
   * Requests exceeding this limit are rejected with an authorization error.
   * Default: 10.
   */
  maxSubjects?: number;
  /**
   * Maximum number of concurrent subject retrievals.
   * Default: 5.
   */
  concurrencyLimit?: number;
  /**
   * Global token budget shared across ALL subjects.
   * Per-subject allowance = floor(globalBudget / subjectCount).
   * A small over-fetch factor may be used and the result truncated.
   */
  globalMaxTokens: number;
  /**
   * Over-fetch factor applied to each per-subject call.
   * e.g. 1.2 fetches 20% more per subject, then final merge truncates.
   * Default: 1.0 (no over-fetch).
   */
  overFetchFactor?: number;
  /**
   * Behavior when one subject fails:
   * - "strict" (default for public widget): fail the entire request.
   * - "partial": return what succeeded with a warning.
   * Authorization/cross-tenant failures always use "strict".
   */
  failureMode?: "strict" | "partial";
  /**
   * Timeout in milliseconds for each individual subject retrieval.
   * Default: 10000.
   */
  perSubjectTimeoutMs?: number;
}
