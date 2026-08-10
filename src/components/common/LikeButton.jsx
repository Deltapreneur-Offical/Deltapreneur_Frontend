import { useState } from 'react';
import { Heart } from 'lucide-react';

export default function LikeButton({
  liked,
  count,
  onToggle,
  size = 'sm',
  forceRed = false,
  variant = 'light',
  className = '',
}) {
  const [animating, setAnimating] = useState(false);
  const isActive = liked || forceRed;
  const iconSize = size === 'sm' ? 14 : 16;

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const heartClass = `listing-like-btn__icon ${
    isActive ? 'listing-like-btn__icon--active' : 'listing-like-btn__icon--idle'
  }`;

  if (!onToggle) {
    return (
      <span
        className={`listing-like-btn listing-like-btn--readonly ${size === 'sm' ? 'listing-like-btn--sm' : 'listing-like-btn--md'} ${className}`.trim()}
        aria-label={`${count || 0} likes`}
      >
        <span className="listing-like-btn__count">
          {count || 0}
        </span>
        <Heart
          size={14}
          className={heartClass}
          strokeWidth={2.25}
          fill={isActive ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </span>
    );
  }

  const handleClick = async (e) => {
    stop(e);
    setAnimating(true);
    try {
      await onToggle();
    } finally {
      setTimeout(() => setAnimating(false), 300);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={stop}
      title={liked ? 'Unlike' : 'Like'}
      className={`listing-like-btn listing-like-btn--interactive ${
        size === 'sm' ? 'listing-like-btn--sm' : 'listing-like-btn--md'
      } listing-like-btn--light ${animating ? 'listing-like-btn--animating' : ''} ${className}`.trim()}
    >
      <span className="listing-like-btn__count">
        {count || 0}
      </span>
      <Heart
        size={14}
        className={heartClass}
        strokeWidth={2.25}
        fill={isActive ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
    </button>
  );
}
