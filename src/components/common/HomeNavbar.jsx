import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import logoBlack from '../../assets/Cobrother_logo.png';
import logoGreen from '../../assets/Cobrother_Green.png';
import BackButton from './BackButton';
import HomeTopNavActions from './HomeTopNavActions';

function HomeNavLogo({ className = '' }) {
  return (
    <span className={`home-nav-logo-swap ${className}`.trim()}>
      <img src={logoBlack} alt="CoBrother" className="home-nav-logo-img home-nav-logo-img--default" />
      <img src={logoGreen} alt="" aria-hidden className="home-nav-logo-img home-nav-logo-img--hover" />
    </span>
  );
}

function NavDropdown({ label, open, onToggle, children }) {
  return (
    <div className="relative">
      <button
        type="button"
        className={`home-nav-pill ${open ? 'is-open' : ''}`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>{label}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="home-nav-dropdown-panel">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownLink({ onClick, children }) {
  return (
    <button type="button" className="home-nav-dropdown-link" onClick={onClick}>
      {children}
    </button>
  );
}

function MobileAccordion({ title, open, onToggle, children }) {
  return (
    <div className="home-mobile-accordion">
      <button type="button" className="home-mobile-accordion-trigger" onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <ChevronDown size={18} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="home-mobile-accordion-panel">{children}</div>}
    </div>
  );
}

export default function HomeNavbar({ navRef, openDropdown, setOpenDropdown, navigate, showBack = false }) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState(null);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileAccordion(null);
    setOpenDropdown(null);
  };

  const toggleDesktopDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const go = (path, state) => {
    navigate(path, state ? { state } : undefined);
    closeMobileMenu();
  };

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.classList.remove('home-menu-open');
      return undefined;
    }
    document.body.classList.add('home-menu-open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('home-menu-open');
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1280) closeMobileMenu();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const authButtons = !authLoading && !user ? (
    <>
      <button type="button" className="btn-glow btn-glow-nav whitespace-nowrap" onClick={() => navigate('/join-form')}>
        {t('joinCoBrother')}
      </button>
      <button type="button" className="btn-glow btn-glow-nav whitespace-nowrap" onClick={() => navigate('/login', { state: { showLoginForm: true } })}>
        {t('signIn')}
      </button>
    </>
  ) : null;

  return (
    <>
      <nav
        className="home-main-nav w-full min-w-0 bg-white border-b border-gray-100 sticky z-[1000]"
        style={{ top: 'var(--home-topbar-height, 40px)' }}
        ref={navRef}
      >
        <div className="home-main-nav-inner">
          <div className="home-main-nav-start">
          <button
            type="button"
            className="home-nav-logo-btn shrink-0"
            onClick={() => navigate('/')}
            aria-label="CoBrother home"
          >
            <HomeNavLogo />
          </button>

          <div className="home-nav-desktop-menu">
            <div className="flex items-center flex-wrap gap-1">
              <NavDropdown
                label={t('domains')}
                open={openDropdown === 'domains'}
                onToggle={() => toggleDesktopDropdown('domains')}
              >
                <DropdownLink onClick={() => go('/domains')}>{t('exploreDomains')}</DropdownLink>
                <DropdownLink onClick={() => go('/domains/dashboard')}>{t('listDomains')}</DropdownLink>
                <DropdownLink onClick={() => go('/auctions')}>{t('bidDomains')}</DropdownLink>
              </NavDropdown>

              <NavDropdown
                label={t('Ventures')}
                open={openDropdown === 'venture'}
                onToggle={() => toggleDesktopDropdown('venture')}
              >
                <DropdownLink onClick={() => go('/ventures')}>{t('exploreVenture')}</DropdownLink>
                <DropdownLink onClick={() => go('/ventures/new')}>{t('listVenture')}</DropdownLink>
                <DropdownLink onClick={() => go('/auctions')}>{t('bidVenture')}</DropdownLink>
              </NavDropdown>

              <NavDropdown
                label={t('auctions')}
                open={openDropdown === 'auctions'}
                onToggle={() => toggleDesktopDropdown('auctions')}
              >
                <DropdownLink onClick={() => go('/auctions')}>{t('auctionDomain')}</DropdownLink>
                <DropdownLink onClick={() => go('/venture-auction')}>{t('auctionVenture')}</DropdownLink>
                <DropdownLink onClick={() => go('/disruptors')}>{t('auctionDisruptor')}</DropdownLink>
              </NavDropdown>

              <NavDropdown
                label={t('technologies')}
                open={openDropdown === 'technology'}
                onToggle={() => toggleDesktopDropdown('technology')}
              >
                <DropdownLink onClick={() => go('/technology')}>{t('exploreTechnology')}</DropdownLink>
              </NavDropdown>

              <NavDropdown
                label={t('disruptors')}
                open={openDropdown === 'disruptors'}
                onToggle={() => toggleDesktopDropdown('disruptors')}
              >
                <DropdownLink onClick={() => go('/join-form')}>{t('beTheDisruptors')}</DropdownLink>
                <DropdownLink onClick={() => go('/community')}>{t('exploreDisruptors')}</DropdownLink>
                <DropdownLink onClick={() => go('/auctions')}>{t('bidDisruptors')}</DropdownLink>
              </NavDropdown>
            </div>
          </div>
          </div>

          <div className="home-main-nav-toolbar">
            <div className="home-top-nav-actions">
              <HomeTopNavActions />
            </div>
            <button
              type="button"
              className="home-nav-hamburger"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <div className="home-main-nav-end">
            {showBack && (
              <div className="home-nav-desktop-cta hidden sm:block">
                <BackButton to="/" label={t('Home')} variant="pill" />
              </div>
            )}
            {authButtons ? (
              <div className="home-nav-desktop-cta home-nav-cta-group">
                {authButtons}
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Mobile / tablet drawer */}
      {mobileMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
          <button
            type="button"
            className="home-nav-overlay"
            aria-label="Close menu"
            onClick={closeMobileMenu}
          />
          <aside className="home-nav-drawer" aria-label="Main navigation">
            <div className="home-nav-drawer-header">
              <span className="home-nav-drawer-title">{t('navMenu')}</span>
              <button type="button" className="home-nav-drawer-close" onClick={closeMobileMenu} aria-label="Close menu">
                <X size={22} strokeWidth={2} />
              </button>
            </div>

            <div className="home-nav-drawer-body">
              <MobileAccordion
                title={t('domains')}
                open={mobileAccordion === 'domains'}
                onToggle={() => setMobileAccordion((v) => (v === 'domains' ? null : 'domains'))}
              >
                <button type="button" className="home-mobile-link" onClick={() => go('/domains')}>{t('exploreDomains')}</button>
                <button type="button" className="home-mobile-link" onClick={() => go('/domains/dashboard')}>{t('listDomains')}</button>
                <button type="button" className="home-mobile-link" onClick={() => go('/auctions')}>{t('bidDomains')}</button>
              </MobileAccordion>

              <MobileAccordion
                title={t('Ventures')}
                open={mobileAccordion === 'venture'}
                onToggle={() => setMobileAccordion((v) => (v === 'venture' ? null : 'venture'))}
              >
                <button type="button" className="home-mobile-link" onClick={() => go('/ventures')}>{t('exploreVenture')}</button>
                <button type="button" className="home-mobile-link" onClick={() => go('/ventures/new')}>{t('listVenture')}</button>
                <button type="button" className="home-mobile-link" onClick={() => go('/auctions')}>{t('bidVenture')}</button>
              </MobileAccordion>

              <MobileAccordion
                title={t('auctions')}
                open={mobileAccordion === 'auctions'}
                onToggle={() => setMobileAccordion((v) => (v === 'auctions' ? null : 'auctions'))}
              >
                <button type="button" className="home-mobile-link" onClick={() => go('/auctions')}>{t('auctionDomain')}</button>
                <button type="button" className="home-mobile-link" onClick={() => go('/venture-auction')}>{t('auctionVenture')}</button>
                <button type="button" className="home-mobile-link" onClick={() => go('/disruptors')}>{t('auctionDisruptor')}</button>
              </MobileAccordion>

              <MobileAccordion
                title={t('technologies')}
                open={mobileAccordion === 'technology'}
                onToggle={() => setMobileAccordion((v) => (v === 'technology' ? null : 'technology'))}
              >
                <button type="button" className="home-mobile-link" onClick={() => go('/technology')}>{t('exploreTechnology')}</button>
              </MobileAccordion>

              <MobileAccordion
                title={t('disruptors')}
                open={mobileAccordion === 'disruptors'}
                onToggle={() => setMobileAccordion((v) => (v === 'disruptors' ? null : 'disruptors'))}
              >
                <button type="button" className="home-mobile-link" onClick={() => go('/join-form')}>{t('beTheDisruptors')}</button>
                <button type="button" className="home-mobile-link" onClick={() => go('/community')}>{t('exploreDisruptors')}</button>
                <button type="button" className="home-mobile-link" onClick={() => go('/auctions')}>{t('bidDisruptors')}</button>
              </MobileAccordion>
            </div>

            <div className="home-nav-drawer-footer">
              {showBack && (
                <BackButton to="/" label={t('Home')} variant="pill" className="w-full justify-center mb-3" />
              )}
              {!authLoading && !user ? (
                <div className="flex flex-col gap-3 w-full">
                  <button type="button" className="btn-glow btn-glow-md w-full" onClick={() => go('/join-form')}>
                    {t('joinCoBrother')}
                  </button>
                  <button type="button" className="btn-glow btn-glow-md w-full" onClick={() => go('/login', { showLoginForm: true })}>
                    {t('signIn')}
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </>,
        document.body,
        )}

    </>
  );
}

