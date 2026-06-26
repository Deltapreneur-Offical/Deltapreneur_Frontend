import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * @param {string} [to] - navigate here; omit to use history back
 * @param {string} [label] - default translated "Back"
 */
export default function BackButton({
  to,
  label,
  className = '',
  variant = 'default',
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isHovering, setIsHovering] = useState(false);
  const resolvedLabel = label ?? t('auctionDetailBack');

  const handleClick = () => {
    if (to) {
      navigate(to);
      return;
    }
    const historyIndex = window.history.state?.idx ?? 0;
    if (historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const base =
    variant === 'home'
      ? 'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2'
      : variant === 'pill'
      ? 'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200'
      : 'inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 text-white shadow-md';

  const hoverStyles = isHovering
    ? {
      background: 'linear-gradient(90deg, #3b82f6, #a855f7, #ec4899)',
      opacity: 0.85,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
    }
    : {
      background: 'linear-gradient(90deg, #3b82f6, #a855f7, #ec4899)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setIsHovering(true)}
      onBlur={() => setIsHovering(false)}
      className={`${base} ${className}`.trim()}
      style={hoverStyles}
    >
      <ArrowLeft size={16} className="shrink-0" aria-hidden />
      <span>{resolvedLabel}</span>
    </button>
  );
}
