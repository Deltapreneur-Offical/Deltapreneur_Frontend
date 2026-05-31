import { useState } from 'react';

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
  const isLight = variant === 'light';

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  if (!onToggle) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${
          size === 'sm' ? 'text-[0.72rem]' : 'text-[0.82rem]'
        } ${isLight ? 'text-gray-500' : 'text-gray-500'}`}
        aria-label={`${count || 0} likes`}
      >
        <span className={isActive ? 'grayscale-0' : 'grayscale'}>❤️</span>
        <span className={`font-semibold ${isActive ? 'text-[#c86e6e]' : ''}`}>
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
      className={`inline-flex items-center gap-1.5 rounded-[20px] cursor-pointer transition-all duration-200 ${
        size === 'sm' ? 'px-2.5 py-1' : 'px-3.5 py-1.5'
      } ${
        isActive
          ? 'bg-red-50 border-red-200'
          : isLight
            ? 'bg-gray-50 border-gray-200 hover:bg-red-50 hover:border-red-100'
            : 'bg-white/5 border-white/10'
      } border ${animating ? 'scale-110' : 'scale-100'}`}
    >
      <span
        className={`transition-all duration-200 ${
          size === 'sm' ? 'text-[0.85rem]' : 'text-base'
        } ${isActive ? 'grayscale-0' : 'grayscale'}`}
      >
        ❤️
      </span>
      <span
        className={`font-semibold transition-colors duration-200 ${
          size === 'sm' ? 'text-[0.72rem]' : 'text-[0.82rem]'
        } ${isActive ? 'text-[#c86e6e]' : isLight ? 'text-gray-500' : 'text-gray-500'}`}
      >
        {count || 0}
      </span>
    </button>
  );
}
