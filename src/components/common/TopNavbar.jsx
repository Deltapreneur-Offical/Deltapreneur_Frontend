import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeTopNavActions from './HomeTopNavActions';
import BrandNavLogo from './BrandNavLogo';

export default function TopNavbar({ homeMobileMenu = false, hideContactUs = false, isScrolled = false }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const stackedWithMainNav = Boolean(homeMobileMenu);

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate('/');
  };

  return (
    <div
      className={`home-top-nav md:sticky top-0 z-[1001] w-full min-w-0 border-b border-slate-200/70 bg-white/85 font-body backdrop-blur-md backdrop-saturate-150 ${
        stackedWithMainNav ? 'home-top-nav-stacked' : 'home-top-nav-standalone'
      }${isScrolled ? ' is-scrolled' : ''}`}
    >
      <div className="home-top-nav-inner">
        {/* Scroll-in logo — only visible when main nav is hidden */}
        <button
          type="button"
          className={`home-top-nav-scroll-logo home-nav-logo-btn${isScrolled ? ' is-visible' : ''}`}
          onClick={handleLogoClick}
          aria-label="CoBrother home"
          tabIndex={isScrolled ? 0 : -1}
        >
          <BrandNavLogo />
        </button>

        <div className="home-top-nav-actions">
          <HomeTopNavActions hideContactUs={hideContactUs} />
        </div>
      </div>

      {homeMobileMenu && mobileMenuOpen && (
        <div className="absolute inset-x-0 top-full border-b border-blue-100 bg-gradient-to-b from-sky-50 to-blue-50/95 px-4 py-3 md:hidden">
          <div className="flex w-full flex-col gap-2">
            <a
              href="/"
              className="rounded px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-blue-100/80"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('topNavHome')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
