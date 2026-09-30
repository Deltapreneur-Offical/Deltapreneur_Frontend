import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Gavel, Handshake } from 'lucide-react';
import useAutoHideOnScroll from '../../hooks/useAutoHideOnScroll';
import useBlockingOverlayOpen from '../../hooks/useBlockingOverlayOpen';
import DomainsIcon from '../../assets/CoBranding.png';
import TechnologyIcon from '../../assets/CoCreation.png';
import CreatorIcon from '../../assets/Deltapreneurs_icon.png';
import {
  BOTTOM_NAV_TABS,
  isBottomNavHiddenRoute,
  isBottomNavTabActive,
} from './mobileBottomNav/bottomNavRoutes';

const BODY_CLASS = 'has-mobile-bottom-nav';
const NAV_ID = 'mobile-bottom-nav';

/** Same icons as the dashboard sidebar for these five destinations. */
const TAB_ICONS = {
  domains: { type: 'image', src: DomainsIcon },
  ventures: { type: 'lucide', Icon: Handshake },
  auctions: { type: 'lucide', Icon: Gavel },
  technology: { type: 'image', src: TechnologyIcon },
  creator: { type: 'image', src: CreatorIcon },
};

/**
 * One smooth hill that meets the bar with a horizontal tangent
 * (raised-cosine bump — matches the proposed handle, not a cloud).
 */
function HandleShape() {
  const curve = 'M 0 26 C 48 26, 62 3, 110 3 C 158 3, 172 26, 220 26';
  return (
    <svg
      className="mobile-bottom-nav__shape"
      viewBox="0 0 220 28"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${curve} L 220 28 L 0 28 Z`} fill="currentColor" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navRef = useRef(null);

  const routeHidden = isBottomNavHiddenRoute(pathname);
  const overlayOpen = useBlockingOverlayOpen();
  const [manualHidden, setManualHidden] = useState(false);
  const { scrolling: autoHidden, reveal } = useAutoHideOnScroll({
    enabled: !routeHidden && !overlayOpen,
  });

  const rendered = !routeHidden && !overlayOpen;
  const hidden = manualHidden || autoHidden;

  const hideLabel = t('mobileBottomNavHide', { defaultValue: 'Hide navigation' });
  const showLabel = t('mobileBottomNavShow', { defaultValue: 'Show navigation' });

  const onToggle = () => {
    if (hidden) {
      setManualHidden(false);
      reveal();
      return;
    }
    setManualHidden(true);
  };

  useEffect(() => {
    if (routeHidden) return undefined;
    document.body.classList.add(BODY_CLASS);
    return () => document.body.classList.remove(BODY_CLASS);
  }, [routeHidden]);

  // Make hidden tabs unfocusable immediately (pointer-events alone does not stop keyboard focus).
  // Inert is on the nav only — the handle must stay focusable while the bar is tucked away.
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    if (hidden) {
      el.setAttribute('inert', '');
    } else {
      el.removeAttribute('inert');
    }
  }, [hidden, rendered]);

  if (!rendered) return null;

  return (
    <div
      className="mobile-bottom-nav"
      data-hidden={hidden ? 'true' : 'false'}
    >
      <div className="mobile-bottom-nav__handle">
        <HandleShape />
        <button
          type="button"
          className="mobile-bottom-nav__toggle"
          onClick={onToggle}
          aria-label={hidden ? showLabel : hideLabel}
          aria-controls={NAV_ID}
          aria-expanded={!hidden}
        >
          {hidden ? (
            <ChevronUp aria-hidden="true" strokeWidth={2.4} />
          ) : (
            <ChevronDown aria-hidden="true" strokeWidth={2.4} />
          )}
        </button>
      </div>
      <nav
        ref={navRef}
        id={NAV_ID}
        className="mobile-bottom-nav__bar"
        aria-label={t('mobileBottomNavLabel', { defaultValue: 'Primary navigation' })}
        aria-hidden={hidden ? 'true' : undefined}
      >
        {BOTTOM_NAV_TABS.map((tab) => {
          const icon = TAB_ICONS[tab.id];
          const active = isBottomNavTabActive(tab, pathname);
          return (
            <Link
              key={tab.id}
              to={tab.paths[0]}
              className={`mobile-bottom-nav__item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              tabIndex={hidden ? -1 : undefined}
            >
              {icon.type === 'image' ? (
                <img
                  src={icon.src}
                  alt=""
                  className="mobile-bottom-nav__icon mobile-bottom-nav__icon--img"
                  draggable={false}
                  aria-hidden="true"
                />
              ) : (
                <icon.Icon className="mobile-bottom-nav__icon" aria-hidden="true" strokeWidth={1.9} />
              )}
              <span className="mobile-bottom-nav__label">
                {t(tab.labelKey, { defaultValue: tab.label })}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
