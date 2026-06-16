/**
 * mountStatewaveChat — imperative mount for non-React applications.
 *
 * Renders the StatewaveChat widget into a DOM element without requiring the
 * caller to manage React directly. Suitable for vanilla JS, plain HTML,
 * and any framework that can call a JavaScript function.
 *
 * Usage:
 *   import { mountStatewaveChat } from "@statewavedev/chat-widget";
 *
 *   const { unmount } = mountStatewaveChat(
 *     document.getElementById("statewave-chat"),
 *     {
 *       adapter: myProxyAdapter,
 *       readSubjects: ["user:alice"],
 *       retrievalConfig: { globalMaxTokens: 2000 },
 *     }
 *   );
 *
 *   // Later:
 *   unmount();
 *
 * SECURITY: Same rules apply as StatewaveChat — never pass a Statewave API
 * key or LLM key as part of the adapter in browser code. Use a proxy adapter
 * that calls your server-side route.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { StatewaveChat } from "./StatewaveChat.js";
import type { StatewaveChatProps } from "./StatewaveChat.js";

export interface MountHandle {
  unmount: () => void;
}

export function mountStatewaveChat(
  container: Element | null,
  props: Omit<StatewaveChatProps, "containerClassName">,
): MountHandle {
  if (!container) {
    throw new Error("mountStatewaveChat: container element is null");
  }

  const root = createRoot(container);
  root.render(React.createElement(StatewaveChat, props));

  return {
    unmount() {
      root.unmount();
    },
  };
}
