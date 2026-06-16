/**
 * StatewaveChat — drop-in chat widget for any website.
 *
 * This is a thin composition layer over @statewavedev/chat-react that wires
 * the provider, thread, composer, and optional suggested questions into a
 * single ready-to-use component.
 *
 * SECURITY:
 * - The `adapter` prop MUST NOT contain any private API keys on the client.
 *   Pass a proxy adapter that calls your server route instead.
 * - `readSubjects` must be validated server-side. Do not derive them from
 *   query parameters or user input without server-side authorization.
 *
 * Styling:
 * All className props are forwarded to the underlying components. The widget
 * ships with no default styles — consumers supply their own CSS or className.
 *
 * Usage:
 *   <StatewaveChat
 *     adapter={myProxyAdapter}
 *     readSubjects={["user:alice", "project:x"]}
 *     retrievalConfig={{ globalMaxTokens: 2000 }}
 *     containerClassName="my-chat-container"
 *   />
 */

import {
  StatewaveChatProvider,
  MessageThread,
  ChatComposer,
  SuggestedQuestions,
  useChatMessages,
  useChatLoading,
  useSendMessage,
} from "@statewavedev/chat-react";
import type { StatewaveChatProviderProps } from "@statewavedev/chat-react";

// ---------------------------------------------------------------------------
// Public props
// ---------------------------------------------------------------------------

export interface StatewaveChatProps
  extends Omit<StatewaveChatProviderProps, "children"> {
  /** Outer container class. */
  containerClassName?: string;
  /** Class for the message thread area. */
  threadClassName?: string;
  /** Class for each message. */
  messageClassName?: string;
  /** Class for the user message. */
  userMessageClassName?: string;
  /** Class for the assistant message. */
  assistantMessageClassName?: string;
  /** Class for the composer area. */
  composerClassName?: string;
  /** Class for the textarea input. */
  inputClassName?: string;
  /** Class for the send button. */
  buttonClassName?: string;
  /** Initial suggested questions (shown before first message). */
  suggestedQuestions?: string[];
  /** Class for the suggested questions list. */
  suggestionsClassName?: string;
  /** Custom placeholder for the input. */
  inputPlaceholder?: string;
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export function StatewaveChat(props: StatewaveChatProps) {
  const {
    adapter,
    readSubjects,
    writeSubject,
    persist,
    retrievalConfig,
    answerPolicy,
    containerClassName,
    threadClassName,
    messageClassName,
    userMessageClassName,
    assistantMessageClassName,
    composerClassName,
    inputClassName,
    buttonClassName,
    suggestedQuestions = [],
    suggestionsClassName,
    inputPlaceholder,
  } = props;

  return (
    <StatewaveChatProvider
      adapter={adapter}
      readSubjects={readSubjects}
      writeSubject={writeSubject}
      persist={persist}
      retrievalConfig={retrievalConfig}
      answerPolicy={answerPolicy}
    >
      <div className={containerClassName}>
        <ChatInner
          threadClassName={threadClassName}
          messageClassName={messageClassName}
          userMessageClassName={userMessageClassName}
          assistantMessageClassName={assistantMessageClassName}
          composerClassName={composerClassName}
          inputClassName={inputClassName}
          buttonClassName={buttonClassName}
          suggestedQuestions={suggestedQuestions}
          suggestionsClassName={suggestionsClassName}
          inputPlaceholder={inputPlaceholder}
        />
      </div>
    </StatewaveChatProvider>
  );
}

interface ChatInnerProps {
  threadClassName?: string;
  messageClassName?: string;
  userMessageClassName?: string;
  assistantMessageClassName?: string;
  composerClassName?: string;
  inputClassName?: string;
  buttonClassName?: string;
  suggestedQuestions: string[];
  suggestionsClassName?: string;
  inputPlaceholder?: string;
}

function ChatInner({
  threadClassName,
  messageClassName,
  userMessageClassName,
  assistantMessageClassName,
  composerClassName,
  inputClassName,
  buttonClassName,
  suggestedQuestions,
  suggestionsClassName,
  inputPlaceholder,
}: ChatInnerProps) {
  const messages = useChatMessages();
  const isLoading = useChatLoading();
  const sendMessage = useSendMessage();

  const hasMessages = messages.length > 0;

  return (
    <>
      {!hasMessages && suggestedQuestions.length > 0 && (
        <SuggestedQuestions
          questions={suggestedQuestions}
          onSelect={sendMessage}
          className={suggestionsClassName}
        />
      )}
      <MessageThread
        messages={messages}
        isLoading={isLoading}
        className={threadClassName}
        messageClassName={messageClassName}
        userMessageClassName={userMessageClassName}
        assistantMessageClassName={assistantMessageClassName}
      />
      <ChatComposer
        onSend={sendMessage}
        isLoading={isLoading}
        placeholder={inputPlaceholder}
        className={composerClassName}
        inputClassName={inputClassName}
        buttonClassName={buttonClassName}
      />
    </>
  );
}
