import { useState } from 'react';
import { Heart } from 'lucide-react';

export default function LikeButton({
  liked,
  count,
  onToggle,
  size = 'sm',
  forceRed = false,
  variant = 'light',
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
        className={`listing-like-btn listing-like-btn--readonly ${size === 'sm' ? 'listing-like-btn--sm' : 'listing-like-btn--md'}`}
        aria-label={`${count || 0} likes`}
      >
        <Heart
          size={iconSize}
          className={heartClass}
          strokeWidth={1.5}
          fill={isActive ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
        <span className="listing-like-btn__count">
          {count || 0}
        </span>
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
      } listing-like-btn--light ${animating ? 'listing-like-btn--animating' : ''}`}
    >
      <Heart
        size={iconSize}
        className={heartClass}
        strokeWidth={1.5}
        fill={isActive ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      <span className="listing-like-btn__count">
        {count || 0}
      </span>
    </button>
  );
}
