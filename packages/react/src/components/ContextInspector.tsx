/**
 * ContextInspector — debug panel showing the retrieved context bundle.
 *
 * Intended for the statewave-admin "Chat with Memory" feature where
 * developers can inspect what memory items were retrieved for a query.
 * Not intended for end-user-facing widgets.
 *
 * Renders nothing if no context bundle is available.
 */

import { useState } from "react";
import type { ChatContextBundle, ChatContextItem } from "@statewavedev/chat-core";

export interface ContextInspectorProps {
  bundle: ChatContextBundle | undefined;
  className?: string;
}

export function ContextInspector({ bundle, className }: ContextInspectorProps) {
  if (!bundle || bundle.items.length === 0) return null;

  return (
    <aside className={className} aria-label="Retrieved context" role="complementary">
      <ContextInspectorHeader bundle={bundle} />
      {bundle.items.map((item) => (
        <ContextItemRow key={item.id} item={item} />
      ))}
      {bundle.subjectWarnings.length > 0 && (
        <div role="alert">
          <strong>Warnings:</strong>
          <ul>
            {bundle.subjectWarnings.map((w, i) => (
              <li key={i}>
                {w.subject}: {w.reason}
                {w.detail ? ` — ${w.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function ContextInspectorHeader({ bundle }: { bundle: ChatContextBundle }) {
  return (
    <div>
      <span>{bundle.items.length} item{bundle.items.length !== 1 ? "s" : ""}</span>
      <span>{bundle.totalTokens} tokens</span>
      <span>{bundle.successfulSubjects.length} subject{bundle.successfulSubjects.length !== 1 ? "s" : ""}</span>
    </div>
  );
}

function ContextItemRow({ item }: { item: ChatContextItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={`Toggle ${item.id}`}
      >
        <span>{item.id}</span>
        <span>{item.subject}</span>
        {item.source?.title && <span>{item.source.title}</span>}
        {item.tokenCount !== undefined && <span>{item.tokenCount}t</span>}
      </button>
      {expanded && (
        <pre>
          {item.content}
        </pre>
      )}
    </div>
  );
}
