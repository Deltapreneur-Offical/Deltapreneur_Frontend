import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function HomeSectionHeader({ title, to }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4 mb-1 md:mb-2">
      <h3 className="home-section-heading font-display text-[1.4rem] md:text-[1.75rem] font-bold text-gray-900 m-0 [text-shadow:0_1px_1px_rgba(15,23,42,0.22),0_2px_8px_rgba(15,23,42,0.28),0_4px_16px_rgba(15,23,42,0.12)]">
        {title}
      </h3>
      {to ? (
        <Link
          to={to}
          className="shrink-0 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
        >
          {t('viewAll')} →
        </Link>
      ) : null}
    </div>
  );
}
