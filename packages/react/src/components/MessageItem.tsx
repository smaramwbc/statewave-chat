/**
 * MessageItem — renders a single ChatMessage (user or assistant).
 * Unstyled by default; consumers add className for styling.
 */

import React from "react";
import type { ChatMessage } from "@statewavedev/chat-core";
import { Citations } from "./Citations.js";

export interface MessageItemProps {
  message: ChatMessage;
  /** Custom renderer for message content. Receives the raw content string. */
  renderContent?: (content: string) => React.ReactNode;
  className?: string;
  userClassName?: string;
  assistantClassName?: string;
}

export function MessageItem({
  message,
  renderContent,
  className,
  userClassName,
  assistantClassName,
}: MessageItemProps) {
  const roleClass = message.role === "user" ? userClassName : assistantClassName;
  const combinedClass = [className, roleClass].filter(Boolean).join(" ") || undefined;

  return (
    <div
      data-role={message.role}
      data-status={message.status}
      className={combinedClass}
      aria-label={`${message.role} message`}
    >
      {renderContent ? renderContent(message.content) : <span>{message.content}</span>}
      {message.status === "error" && message.error && (
        <div data-error={message.error.code} role="alert">
          {message.error.message}
        </div>
      )}
      {message.citations && message.citations.length > 0 && (
        <Citations citations={message.citations} />
      )}
    </div>
  );
}
