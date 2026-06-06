import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Back link above listing/create forms — matches New Venture page pattern.
 * Pass `to` to navigate, or `onClick` to close an inline form on hub pages.
 */
export default function ListingBackLink({ to, onClick, label }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 transition-colors"
    >
      <ArrowLeft size={16} aria-hidden />
      {label}
    </button>
  );
}
