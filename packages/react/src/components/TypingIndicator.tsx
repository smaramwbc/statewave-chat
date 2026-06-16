
export interface TypingIndicatorProps {
  className?: string;
  label?: string;
}

export function TypingIndicator({
  className,
  label = "Assistant is typing",
}: TypingIndicatorProps) {
  return (
    <div
      className={className}
      aria-label={label}
      role="status"
      data-testid="typing-indicator"
    >
      <span aria-hidden="true">…</span>
    </div>
  );
}
