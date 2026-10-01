import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { ventureListChooseUrl } from '../../constants/ventureListingTypeContent';

export default function VentureListingQuickActions() {
  const { t } = useTranslation();

  return (
    <>
      <Link to={ventureListChooseUrl('venture')} className="listing-header-actions__btn">
        <Plus aria-hidden="true" />
        <span>{t('listVenture', { defaultValue: 'List Venture' })}</span>
      </Link>
      <Link
        to={ventureListChooseUrl('co-venture')}
        className="listing-header-actions__btn"
      >
        <Plus aria-hidden="true" />
        <span>{t('venturesPageListCoVentureCta', { defaultValue: 'List Delta-Venture' })}</span>
      </Link>
    </>
  );
}
