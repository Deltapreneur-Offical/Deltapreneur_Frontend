import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, BarChart3 } from 'lucide-react';

const navBtnCls =
  'btn-glow btn-glow-sm flex items-center justify-center gap-1.5 text-sm py-2.5 px-3 sm:px-4 min-h-[44px] whitespace-nowrap';
const activeCls = 'dashboard-active-control';

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
    <nav
      className="flex flex-wrap gap-2 mb-6 p-1.5 rounded-xl border border-gray-200 bg-gray-50/80"
      aria-label="Venture navigation"
    >
      <button
        type="button"
        className={`${navBtnCls} ${activeRoute === 'dashboard' ? activeCls : ''}`}
        onClick={() => navigate('/ventures/dashboard')}
      >
        <LayoutDashboard size={16} className="shrink-0" aria-hidden />
        <span>{t('dashboard')}</span>
      </button>
      <button
        type="button"
        className={`${navBtnCls} ${activeRoute === 'analytics' ? activeCls : ''}`}
        onClick={() => navigate('/ventures/analytics')}
      >
        <BarChart3 size={16} className="shrink-0" aria-hidden />
        <span>{t('analytics')}</span>
      </button>
      <button
        type="button"
        className={`${navBtnCls} ${activeRoute === 'marketplace' && marketplaceTab === 'all' ? activeCls : ''}`}
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
        className={`${navBtnCls} ${activeRoute === 'marketplace' && marketplaceTab === 'mine' ? activeCls : ''}`}
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
    </nav>
  );
}
