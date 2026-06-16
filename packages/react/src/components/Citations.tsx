/**
 * Citations — renders validated citations from a ChatMessage.
 *
 * SECURITY: Source URLs are passed through safeUrl() before rendering
 * as anchor tags. Only https:// and http:// URLs are rendered as links.
 * Other values are displayed as plain text.
 *
 * The source URL, title, and other metadata come exclusively from the
 * server-side context bundle — never from the model output.
 */

import type { ChatCitation } from "@statewavedev/chat-core";
import { safeUrl } from "../safe-url.js";
import { sourceProviderLabel } from "@statewavedev/chat-core";

export interface CitationsProps {
  citations: ChatCitation[];
  className?: string;
  itemClassName?: string;
}

export function Citations({ citations, className, itemClassName }: CitationsProps) {
  if (citations.length === 0) return null;

  return (
    <ul className={className} aria-label="Sources" role="list">
      {citations.map((citation) => (
        <li key={citation.id} className={itemClassName}>
          <CitationItem citation={citation} />
        </li>
      ))}
    </ul>
  );
}

function CitationItem({ citation }: { citation: ChatCitation }) {
  const label = sourceProviderLabel(citation.source);
  const safe = safeUrl(citation.source?.url);

  if (safe) {
    return (
      <a
        href={safe.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Source: ${label}`}
        data-citation-id={citation.id}
      >
        {label}
      </a>
    );
  }

  return (
    <span aria-label={`Source: ${label}`} data-citation-id={citation.id}>
      {label}
    </span>
  );
}
