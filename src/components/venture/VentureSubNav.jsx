import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, BarChart3 } from 'lucide-react';

/**
 * Shared venture section navigation: Dashboard, Analytics, All Ventures, My Ventures.
 *
 * @param {'all'|'mine'} [marketplaceTab] - active tab on /ventures (omit on other routes)
 * @param {(tab: 'all'|'mine') => void} [onMarketplaceTabChange]
 * @param {'marketplace'|'dashboard'|'analytics'} activeRoute
 */
export default function VentureSubNav({
  marketplaceTab = 'all',
  onMarketplaceTabChange,
  activeRoute = 'marketplace',
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <nav className="venture-subnav" aria-label="Venture navigation">
      <div className="venture-subnav__row" role="group" aria-label={t('dashboard')}>
        <button
          type="button"
          className={activeRoute === 'dashboard' ? 'is-active' : ''}
          onClick={() => navigate('/ventures/dashboard')}
        >
          <LayoutDashboard size={15} strokeWidth={2.2} className="shrink-0" aria-hidden />
          <span>{t('dashboard')}</span>
        </button>
        <button
          type="button"
          className={activeRoute === 'analytics' ? 'is-active' : ''}
          onClick={() => navigate('/ventures/analytics')}
        >
          <BarChart3 size={15} strokeWidth={2.2} className="shrink-0" aria-hidden />
          <span>{t('analytics')}</span>
        </button>
      </div>
      <div className="venture-subnav__row" role="tablist" aria-label={t('coVentures')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeRoute === 'marketplace' && marketplaceTab === 'all'}
          className={activeRoute === 'marketplace' && marketplaceTab === 'all' ? 'is-active' : ''}
          onClick={() => {
            if (activeRoute === 'marketplace' && onMarketplaceTabChange) {
              onMarketplaceTabChange('all');
            } else {
              navigate('/ventures');
            }
          }}
        >
          <span>{t('allVentures')}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeRoute === 'marketplace' && marketplaceTab === 'mine'}
          className={activeRoute === 'marketplace' && marketplaceTab === 'mine' ? 'is-active' : ''}
          onClick={() => {
            if (activeRoute === 'marketplace' && onMarketplaceTabChange) {
              onMarketplaceTabChange('mine');
            } else {
              navigate('/ventures?tab=mine');
            }
          }}
        >
          <span>{t('venturesPageMyVentures')}</span>
        </button>
      </div>
    </nav>
  );
}
