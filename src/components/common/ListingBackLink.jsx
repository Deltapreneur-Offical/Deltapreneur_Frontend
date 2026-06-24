import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Back link above listing/create forms — matches New Venture page pattern.
 * Pass `to` to navigate, or `onClick` to close an inline form on hub pages.
 */
export default function ListingBackLink({ to, onClick, label }) {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);

  const handleClick = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setIsHovering(true)}
      onBlur={() => setIsHovering(false)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 mb-4 transition-colors"
      style={isHovering ? { backgroundColor: '#000000', borderColor: '#000000', color: '#ffffff' } : {}}
    >
      <ArrowLeft size={16} aria-hidden />
      {label}
    </button>
  );
}
