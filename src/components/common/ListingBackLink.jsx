import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Back link above listing/create forms — matches New Venture page pattern.
 * Pass `to` to navigate, `onClick` to close an inline form, or omit both for history back.
 */
export default function ListingBackLink({ to, onClick, label, fallbackTo = '/' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isHovering, setIsHovering] = useState(false);
  const [clicked, setClicked] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    if (clicked) return;
    setClicked(true);
    
    if (onClick) {
      onClick();
      // Reset clicked in case it doesn't unmount (e.g. inline form toggle)
      setTimeout(() => setClicked(false), 300);
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    
    const historyIndex = window.history.state?.idx ?? 0;
    if (historyIndex > 0) {
      navigate(-1);
      return;
    }
    
    // Use replace: true so we don't build up a broken history stack if they spam it
    navigate(fallbackTo, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setIsHovering(true)}
      onBlur={() => setIsHovering(false)}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 mb-4 transition-colors shadow-sm"
      style={isHovering ? { backgroundColor: '#000000', borderColor: '#000000', color: '#ffffff' } : {}}
    >
      <ArrowLeft size={15} aria-hidden />
      <span>{label || t('back', 'Back')}</span>
    </button>
  );
}

