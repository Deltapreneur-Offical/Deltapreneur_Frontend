import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HomeSectionHeader({ title, to }) {
  const { t } = useTranslation();

  return (
    <header className="home-section-header">
      <div className="home-section-header__top">
        <h2 className="home-section-header__title">{title}</h2>
        {to ? (
          <Link to={to} className="home-section-header__view-all">
            <span>{t('viewAll')}</span>
            <ArrowRight className="home-section-header__view-all-icon" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
