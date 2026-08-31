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
  const compact = variant === 'pill';

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

  const base = compact
    ? 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2'
    : 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2';

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
