import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ventureListChooseUrl } from '../../constants/ventureListingTypeContent';

export default function VentureListingQuickActions({ className = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <Link to={ventureListChooseUrl('venture')} className="btn-glow btn-glow-sm whitespace-nowrap">
        {t('listVenture', { defaultValue: 'List Venture' })}
      </Link>
      <Link
        to={ventureListChooseUrl('co-venture')}
        className="btn-glow btn-glow-sm whitespace-nowrap"
      >
        {t('venturesPageListCoVentureCta', { defaultValue: 'List Delta-Venture' })}
      </Link>
    </div>
  );
}
