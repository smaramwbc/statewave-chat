/**
 * URL safety validation for @statewavedev/chat-react.
 *
 * Source URLs in ChatSource come from connector episodes which may contain
 * attacker-controlled content. This module validates URLs before rendering
 * them as clickable links to prevent javascript: and data: XSS vectors.
 *
 * Only https: and http: URLs are allowed. Unknown schemes are blocked.
 * Relative paths are not accepted.
 *
 * Usage:
 *   const safe = safeUrl(source.url);
 *   if (safe) return <a href={safe.href}>...</a>
 */

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

export interface SafeUrl {
  href: string;
  hostname: string;
  protocol: string;
}

export function safeUrl(raw: string | undefined | null): SafeUrl | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    return { href: url.href, hostname: url.hostname, protocol: url.protocol };
  } catch {
    return null;
  }
}
