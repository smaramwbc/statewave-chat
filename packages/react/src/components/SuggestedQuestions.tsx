/**
 * SuggestedQuestions — displays a list of clickable question chips.
 * Disappears once the user has sent a message.
 */


export interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  className?: string;
  itemClassName?: string;
}

export function SuggestedQuestions({
  questions,
  onSelect,
  className,
  itemClassName,
}: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <ul className={className} aria-label="Suggested questions" role="list">
      {questions.map((q, i) => (
        <li key={i} className={itemClassName}>
          <button
            type="button"
            onClick={() => onSelect(q)}
            aria-label={`Ask: ${q}`}
          >
            {q}
          </button>
        </li>
      ))}
    </ul>
  );
}
