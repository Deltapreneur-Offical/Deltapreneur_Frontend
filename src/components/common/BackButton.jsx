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
    variant === 'pill'
      ? 'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors'
      : 'inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${base} ${className}`.trim()}
    >
      <ArrowLeft size={16} className="shrink-0" aria-hidden />
      <span>{resolvedLabel}</span>
    </button>
  );
}
