/**
 * Fine-grained hooks for @statewavedev/chat-react.
 * These hooks are all derived from the StatewaveChatProvider context.
 */

import { useStatewaveChat } from "./context.js";
import type { ChatContextBundle, ChatMessage, ChatSession } from "@statewavedev/chat-core";

/** Returns the full ChatSession. Use for direct session inspection. */
export function useChatSession(): ChatSession {
  return useStatewaveChat().session;
}

/** Returns only the messages array from the current session. */
export function useChatMessages(): ChatMessage[] {
  return useStatewaveChat().session.messages;
}

/** Returns the latest context bundle (from the last retrieval). */
export function useChatContext(): ChatContextBundle | undefined {
  return useStatewaveChat().session.contextBundle;
}

/** Returns true while a chat turn is in flight. */
export function useChatLoading(): boolean {
  return useStatewaveChat().session.isLoading;
}

/** Returns the last assistant message, or null if no messages yet. */
export function useLastAssistantMessage(): ChatMessage | null {
  const messages = useChatMessages();
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i];
  }
  return null;
}

/** Returns the sendMessage action. */
export function useSendMessage(): (content: string) => void {
  return useStatewaveChat().sendMessage;
}

/** Returns the reset action. */
export function useChatReset(): () => void {
  return useStatewaveChat().reset;
}

/** Returns the abort action. */
export function useChatAbort(): () => void {
  return useStatewaveChat().abort;
}
