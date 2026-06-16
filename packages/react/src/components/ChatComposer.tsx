/**
 * ChatComposer — message input with send button.
 * Calls sendMessage on form submit. Disabled while isLoading.
 */

import React, { useRef, useState } from "react";

export interface ChatComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  /** Custom send button content. Defaults to "Send". */
  sendLabel?: React.ReactNode;
  /** Whether to submit on Enter (without Shift). Default: true. */
  submitOnEnter?: boolean;
}

export function ChatComposer({
  onSend,
  isLoading,
  placeholder = "Ask a question…",
  className,
  inputClassName,
  buttonClassName,
  sendLabel = "Send",
  submitOnEnter = true,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      aria-label="Chat input"
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (submitOnEnter && e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        disabled={isLoading}
        aria-label="Message input"
        aria-disabled={isLoading}
        className={inputClassName}
        rows={1}
      />
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        aria-label="Send message"
        className={buttonClassName}
      >
        {sendLabel}
      </button>
    </form>
  );
}
