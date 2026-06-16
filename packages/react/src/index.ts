/**
 * @statewavedev/chat-react — public API
 */

// Provider + context hook
export type { StatewaveChatContextValue, StatewaveChatProviderProps } from "./context.js";
export { StatewaveChatProvider, useStatewaveChat } from "./context.js";

// Fine-grained hooks
export {
  useChatAbort,
  useChatContext,
  useChatLoading,
  useChatMessages,
  useChatReset,
  useChatSession,
  useLastAssistantMessage,
  useSendMessage,
} from "./useChat.js";

// Components
export type { MessageItemProps } from "./components/MessageItem.js";
export { MessageItem } from "./components/MessageItem.js";

export type { MessageThreadProps } from "./components/MessageThread.js";
export { MessageThread } from "./components/MessageThread.js";

export type { ChatComposerProps } from "./components/ChatComposer.js";
export { ChatComposer } from "./components/ChatComposer.js";

export type { TypingIndicatorProps } from "./components/TypingIndicator.js";
export { TypingIndicator } from "./components/TypingIndicator.js";

export type { CitationsProps } from "./components/Citations.js";
export { Citations } from "./components/Citations.js";

export type { SuggestedQuestionsProps } from "./components/SuggestedQuestions.js";
export { SuggestedQuestions } from "./components/SuggestedQuestions.js";

export type { ContextInspectorProps } from "./components/ContextInspector.js";
export { ContextInspector } from "./components/ContextInspector.js";

// Utilities
export { safeUrl } from "./safe-url.js";
export type { SafeUrl } from "./safe-url.js";
