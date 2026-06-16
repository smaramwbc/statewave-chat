/**
 * MessageThread — renders the full list of chat messages.
 * Unstyled; consumers supply className and custom renderers.
 */

import React, { useEffect, useRef } from "react";
import type { ChatMessage } from "@statewavedev/chat-core";
import { MessageItem } from "./MessageItem.js";
import type { MessageItemProps } from "./MessageItem.js";
import { TypingIndicator } from "./TypingIndicator.js";

export interface MessageThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  className?: string;
  messageClassName?: string;
  userMessageClassName?: string;
  assistantMessageClassName?: string;
  renderContent?: MessageItemProps["renderContent"];
  /** Custom typing indicator component. */
  renderTypingIndicator?: () => React.ReactNode;
  /** Auto-scroll to the latest message. Default: true. */
  autoScroll?: boolean;
}

export function MessageThread({
  messages,
  isLoading,
  className,
  messageClassName,
  userMessageClassName,
  assistantMessageClassName,
  renderContent,
  renderTypingIndicator,
  autoScroll = true,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, autoScroll]);

  return (
    <div className={className} role="log" aria-label="Chat messages" aria-live="polite">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          renderContent={renderContent}
          className={messageClassName}
          userClassName={userMessageClassName}
          assistantClassName={assistantMessageClassName}
        />
      ))}
      {isLoading && (renderTypingIndicator ? renderTypingIndicator() : <TypingIndicator />)}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
