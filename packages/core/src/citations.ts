/**
 * Citation validation for @statewavedev/chat-core.
 *
 * The model returns only citation IDs (e.g. "S1", "S3").
 * The server/adapter resolves them back to full ChatCitation objects.
 *
 * SECURITY: The model MUST NOT provide source URLs, titles, memory IDs,
 * or episode IDs. Those come exclusively from the server-side context bundle.
 * This preserves the statewave-web security property: source metadata comes
 * from the Statewave context bundle, never from model-generated text.
 *
 * Unknown citation IDs are rejected and surfaced as a structured warning.
 */

import type { ChatCitation, ChatContextItem } from "./types.js";

export interface CitationValidationResult {
  validCitations: ChatCitation[];
  unknownIds: string[];
  hasUnknown: boolean;
}

/**
 * Validate model-returned citation IDs against the retrieved context bundle.
 * Returns validated citations built from server-side context items.
 * Unknown IDs are collected but never rendered.
 */
export function validateCitations(
  citationIds: string[],
  contextItems: ChatContextItem[],
): CitationValidationResult {
  if (!Array.isArray(citationIds) || citationIds.length === 0) {
    return { validCitations: [], unknownIds: [], hasUnknown: false };
  }

  const itemById = new Map<string, ChatContextItem>(
    contextItems.map((item) => [item.id, item]),
  );

  const validCitations: ChatCitation[] = [];
  const unknownIds: string[] = [];

  for (const rawId of citationIds) {
    const id = String(rawId).trim();
    const item = itemById.get(id);
    if (!item) {
      unknownIds.push(id);
      continue;
    }
    validCitations.push({
      id,
      contextItemId: item.id,
      subject: item.subject,
      memoryId: item.memoryId,
      episodeId: item.episodeId,
      source: item.source,
    });
  }

  // Deduplicate by contextItemId (model may repeat the same citation)
  const seen = new Set<string>();
  const deduped = validCitations.filter((c) => {
    if (seen.has(c.contextItemId)) return false;
    seen.add(c.contextItemId);
    return true;
  });

  return {
    validCitations: deduped,
    unknownIds,
    hasUnknown: unknownIds.length > 0,
  };
}

/**
 * Check whether a structured completion is internally consistent:
 * - grounded: true but no citationIds → contradiction (when requireCitations)
 * - grounded: false but citationIds present → likely model confusion, allow with warning
 * - grounded: true with all unknown IDs → effectively ungrounded
 */
export function assessGrounding(
  grounded: boolean,
  _citationIds: string[],
  validCount: number,
  requireCitations: boolean,
): { effectivelyGrounded: boolean; contradiction: boolean } {
  if (!grounded) {
    return { effectivelyGrounded: false, contradiction: false };
  }

  if (requireCitations && validCount === 0) {
    return { effectivelyGrounded: false, contradiction: true };
  }

  return { effectivelyGrounded: true, contradiction: false };
}
