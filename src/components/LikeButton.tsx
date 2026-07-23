/**
 * Subtle heart toggle used on agenda rows, timetable blocks, and My day cards.
 */

interface Props {
  liked: boolean;
  onToggle: () => void;
  /** Extra class names (e.g. layout variants). */
  className?: string;
  /** Accessible name override; defaults based on liked state. */
  label?: string;
}

export const LikeButton = ({
  liked,
  onToggle,
  className = '',
  label,
}: Props) => {
  const ariaLabel =
    label ?? (liked ? 'Remove from My day' : 'Add to My day');

  return (
    <button
      type="button"
      className={
        liked
          ? `like-btn is-liked ${className}`.trim()
          : `like-btn ${className}`.trim()
      }
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={liked}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <svg
        className="like-glyph"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        {liked ? (
          <path
            fill="currentColor"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        ) : (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            d="M12.1 18.55l-.1.1-.11-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"
          />
        )}
      </svg>
    </button>
  );
};
