/**
 * Multi-subject global token budget for @statewavedev/chat-core.
 *
 * IMPORTANT: The Statewave server ranks context items independently
 * per subject. The scores are NOT cross-subject comparable. This
 * implementation does NOT claim global relevance ranking.
 *
 * Merge strategy (documented):
 * 1. Retrieve each subject independently with a per-subject token allowance.
 *    allowance = floor(globalBudget / subjectCount) * overFetchFactor
 * 2. Interleave items in round-robin subject order (preserves within-subject
 *    ranking while distributing subjects fairly).
 * 3. Deduplicate by memoryId or episodeId across subjects.
 * 4. Assign deterministic context IDs: S1, S2, ... (in final order).
 * 5. Truncate to the global budget by accumulating token counts.
 * 6. Items without a tokenCount use a character-based estimate (chars / 4).
 *
 * Tie-breaking for items at the same position from different subjects:
 * subjects are ordered by the index they appear in readSubjects.
 *
 * Limitation: a subject with many short items may contribute more items
 * than a subject with fewer long items. This is known and documented.
 */

import type {
  ChatContextBundle,
  ChatContextItem,
  MultiSubjectRetrievalConfig,
  SubjectWarning,
} from "./types.js";

/** Per-subject result from the retrieval layer. */
export interface SubjectRetrievalResult {
  subject: string;
  items: Omit<ChatContextItem, "id">[];
  tokenEstimate: number;
}

/** All subject results after parallel retrieval. */
export interface MultiSubjectResults {
  successful: SubjectRetrievalResult[];
  warnings: SubjectWarning[];
}

/**
 * Compute the per-subject token allowance.
 * Each subject gets an equal slice of the global budget, optionally
 * multiplied by an over-fetch factor for better coverage after merging.
 */
export function perSubjectAllowance(config: MultiSubjectRetrievalConfig, subjectCount: number): number {
  const count = Math.max(1, subjectCount);
  const base = Math.floor(config.globalMaxTokens / count);
  const factor = config.overFetchFactor ?? 1.0;
  return Math.max(1, Math.floor(base * factor));
}

/**
 * Merge per-subject retrieval results into a single ChatContextBundle.
 *
 * Steps:
 * 1. Round-robin interleave by subject order.
 * 2. Deduplicate by memoryId or episodeId.
 * 3. Assign deterministic S1..SN IDs.
 * 4. Truncate to globalMaxTokens.
 */
export function mergeSubjectResults(
  results: MultiSubjectResults,
  config: MultiSubjectRetrievalConfig,
): ChatContextBundle {
  const { successful, warnings } = results;

  if (successful.length === 0) {
    return {
      items: [],
      totalTokens: 0,
      successfulSubjects: [],
      subjectWarnings: warnings,
    };
  }

  // Round-robin interleave
  const merged = roundRobinInterleave(successful);

  // Deduplicate
  const deduped = deduplicateItems(merged);

  // Truncate to global budget and assign IDs
  const { items, totalTokens } = truncateAndAssignIds(deduped, config.globalMaxTokens);

  return {
    items,
    totalTokens,
    successfulSubjects: successful.map((r) => r.subject),
    subjectWarnings: warnings,
  };
}

type RawItem = Omit<ChatContextItem, "id"> & { subject: string };

function roundRobinInterleave(subjects: SubjectRetrievalResult[]): RawItem[] {
  const queues = subjects.map((s) =>
    s.items.map((item) => ({ ...item, subject: s.subject })),
  );
  const result: RawItem[] = [];

  let hasMore = true;
  let i = 0;
  while (hasMore) {
    hasMore = false;
    for (const queue of queues) {
      if (i < queue.length) {
        result.push(queue[i]);
        hasMore = true;
      }
    }
    i++;
  }

  return result;
}

function deduplicateItems(items: RawItem[]): RawItem[] {
  const seenMemory = new Set<string>();
  const seenEpisode = new Set<string>();
  const result: RawItem[] = [];

  for (const item of items) {
    if (item.memoryId) {
      if (seenMemory.has(item.memoryId)) continue;
      seenMemory.add(item.memoryId);
    }
    if (item.episodeId) {
      if (seenEpisode.has(item.episodeId)) continue;
      seenEpisode.add(item.episodeId);
    }
    result.push(item);
  }

  return result;
}

function tokenCount(item: RawItem): number {
  if (item.tokenCount !== undefined && item.tokenCount > 0) return item.tokenCount;
  return Math.ceil(item.content.length / 4);
}

function truncateAndAssignIds(
  items: RawItem[],
  globalBudget: number,
): { items: ChatContextItem[]; totalTokens: number } {
  const result: ChatContextItem[] = [];
  let total = 0;
  let seq = 1;

  for (const item of items) {
    const tokens = tokenCount(item);
    if (total + tokens > globalBudget) break;
    total += tokens;
    result.push({ ...item, id: `S${seq}` });
    seq++;
  }

  return { items: result, totalTokens: total };
}

/**
 * Validate subject count and concurrency limits before retrieval.
 * Throws on authorization-level violations.
 */
export function validateSubjectConfig(
  subjects: string[],
  config: MultiSubjectRetrievalConfig,
): void {
  const max = config.maxSubjects ?? 10;
  if (subjects.length === 0) {
    throw new Error("At least one readSubject is required");
  }
  if (subjects.length > max) {
    throw new Error(
      `Subject count ${subjects.length} exceeds maximum ${max}`,
    );
  }
}
