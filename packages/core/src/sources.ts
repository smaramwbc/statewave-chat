/**
 * Source normalization for @statewavedev/chat-core.
 *
 * Converts connector episode provenance into a generic ChatSource.
 * The episode's top-level `source` object is the primary provenance.
 * `metadata` is the extensible fallback for title, section, author, etc.
 *
 * The provider/type split follows the connector convention:
 *   episode.source.type = "github.issue" → provider: "github", type: "issue"
 *   episode.source.type = "slack.message" → provider: "slack", type: "message"
 *   episode.source.type = "docs.page" → provider: "markdown", type: "page"
 *
 * Unknown providers must fall back gracefully — never error on an
 * unrecognised source type.
 *
 * SECURITY: source.url is not validated here — it must be passed through
 * safeUrl() before rendering in the browser.
 */

import type { ChatSource } from "./types.js";

/** Raw episode source as returned by the Statewave server SDK. */
export interface RawEpisodeSource {
  source?: string;
  type?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
}

/**
 * Normalized episode provenance from a connector episode.
 * `sourcePointer` is the episode's top-level `source` object from connectors.
 */
export interface ConnectorSourcePointer {
  type: string;
  id: string;
  url?: string;
}

/**
 * Normalize a connector source pointer and episode metadata into a ChatSource.
 *
 * Uses the episode's top-level source as primary provenance.
 * Falls back to metadata for display-layer fields (title, section, author).
 */
export function normalizeSource(
  sourcePointer?: ConnectorSourcePointer,
  metadata?: Record<string, unknown>,
  episodeSource?: string,
  episodeType?: string,
): ChatSource | undefined {
  if (!sourcePointer && !episodeSource && !episodeType) return undefined;

  const result: ChatSource = {};

  // Derive provider and entity type from the connector source.type (e.g. "github.issue")
  if (sourcePointer?.type) {
    const dotIdx = sourcePointer.type.indexOf(".");
    if (dotIdx > 0) {
      result.provider = sourcePointer.type.slice(0, dotIdx);
      result.type = sourcePointer.type.slice(dotIdx + 1);
    } else {
      result.provider = sourcePointer.type;
    }
  } else if (episodeSource) {
    result.provider = episodeSource;
    result.type = episodeType;
  }

  // Canonical URL comes from source.url (always preferred)
  if (sourcePointer?.url) {
    result.id = sourcePointer.id;
    result.url = sourcePointer.url;
  }

  // Display metadata from episode.metadata (extensible fallback)
  if (metadata) {
    // title: metadata.title is standard across connectors
    if (typeof metadata.title === "string" && metadata.title) {
      result.title = metadata.title;
    }
    // section: from markdown connector (section_path or breadcrumb)
    if (typeof metadata.section_path === "string" && metadata.section_path) {
      result.section = metadata.section_path;
    } else if (typeof metadata.breadcrumb === "string" && metadata.breadcrumb) {
      result.section = metadata.breadcrumb;
    }
    // For docs/markdown: derive title from path if not set
    if (!result.title && typeof metadata.path === "string" && metadata.path) {
      result.title = pathToTitle(metadata.path as string);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Derive a display title from a file path.
 * "docs/api/authentication.md" → "Authentication"
 */
function pathToTitle(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base
    .replace(/\.(md|mdx|txt)$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract a human-readable label for a source provider.
 * Used for display in citation chips when no title is available.
 */
export function sourceProviderLabel(source?: ChatSource): string {
  if (!source) return "Source";
  if (source.title) return source.title;
  if (source.provider && source.type) {
    return `${capitalize(source.provider)} ${capitalize(source.type)}`;
  }
  if (source.provider) return capitalize(source.provider);
  if (source.type) return capitalize(source.type);
  return "Source";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
