import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function HomeSectionHeader({ title, to }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4 mb-1 md:mb-2">
      <h3 className="font-display text-[1.4rem] md:text-[1.75rem] font-bold text-gray-900 m-0">
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
