import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Handshake, Gavel, ShoppingBag, ShoppingCart, User, Bell, LogOut, Menu, X, PanelLeft, Shield, Store, Headset, Award, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { notificationAPI } from '../../api/services';
import { virtualAssistantAPI } from '../../api/services';
import { unwrapApiData, unwrapApiList } from '../../utils/apiResponse';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';
import api from '../../api/axios';
import TechnologyIcon from '../../assets/CoCreation.png';
import BrandNavLogo from '../common/BrandNavLogo';
import DomainsIcon from '../../assets/CoBranding.png';
import CreatorIcon from '../../assets/Cobrother_Profile.png';
import CartButton from '../common/CartButton';
import CurrencyDropdown from '../common/CurrencyDropdown';
import LanguageDropdown from '../common/LanguageDropdown';
import AppProfileRegionalMenu from './AppProfileRegionalMenu';
import HomeFooter from '../common/HomeFooter';
import BackButton from '../common/BackButton';
import { getAppBackTarget } from '../../utils/appNavigation';
import { resolveUserDisplayName } from '../../utils/userDisplayName';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '../../config/contactLinks';
import { useDomainPendingVerification } from '../../hooks/useDomainPendingVerification';
import { PendingVerificationDot } from '../domains/DomainVerificationPendingBanner';
import ConfirmationModal from '../common/ConfirmationModal';
import TopNavbar from '../common/TopNavbar';
import HomeNavbar from '../common/HomeNavbar';

const sidebarItems = [
  { icon: Home, labelKey: 'dashboard', to: '/dashboard', isImage: false },
  { icon: Headset, labelKey: 'operations', to: '/operations', isImage: false },
  { icon: DomainsIcon, labelKey: 'domains', to: '/domains', isImage: true, iconImgClass: 'app-sidebar-icon-img--domain' },
  { icon: Store, labelKey: 'storefront', to: '/storefront', isImage: false },
  { icon: Handshake, labelKey: 'coVentures', to: '/ventures', isImage: false },
  { icon: TechnologyIcon, labelKey: 'technology', to: '/technology', isImage: true, iconImgClass: 'app-sidebar-icon-img--technology' },
  {
    icon: CreatorIcon,
    labelKey: 'creator',
    to: '/creator',
    isImage: true,
    iconImgClass: 'app-sidebar-icon-img--creator',
  },
  { icon: Gavel, labelKey: 'auctions', to: '/auctions', isImage: false },
  { icon: ShoppingBag, labelKey: 'purchases', to: '/purchases', isImage: false },
  {
    icon: Briefcase,
    labelKey: 'navVirtualAssistant',
    isImage: false,
    children: [
      {
        labelKey: 'navVaMyJourney',
        to: '/virtual-assistant/journey',
      },
      {
        labelKey: 'navVaWorkspace',
        to: '/virtual-assistant/workspace',
      },
    ],
  },
];

const adminNavItem = {
  icon: Shield,
  labelKey: 'navAdminPanel',
  to: '/admin',
  isImage: false,
  adminAccent: true,
};

function isAdminUser(user) {
  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  return ['ADMIN', 'ROLE_ADMIN', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'AUCTION_MODERATOR', 'ROLE_AUCTION_MODERATOR'].includes(roleUpper);
}

function getNavItems(user, showVaItems) {
  const baseItems = showVaItems
    ? sidebarItems
    : sidebarItems.filter((item) => item.labelKey !== 'navVirtualAssistant');
  if (!isAdminUser(user)) return baseItems;
  const purchasesIdx = baseItems.findIndex((item) => item.to === '/purchases');
  const insertAt = purchasesIdx >= 0 ? purchasesIdx + 1 : baseItems.length;
  return [...baseItems.slice(0, insertAt), adminNavItem, ...baseItems.slice(insertAt)];
}
function SidebarNavItem({
  item,
  active,
  isActivePath,
  accent,
  collapsed,
  domainPendingCount,
  onClick,
  t,
  depth = 0,
}) {
  const Icon = item.icon;
  const showDomainPending = item.to === '/domains' && domainPendingCount > 0;

  // Group nodes (have children but no own route) render a label + nested items.
  if (item.children && !item.to) {
    return (
      <div className={`app-sidebar-group${depth > 0 ? ' app-sidebar-group--nested' : ''}`}>
        {!collapsed && !item.hideLabel && (
          <div className="app-sidebar-group-label">{t(item.labelKey)}</div>
        )}
        <div className="app-sidebar-group-items">
          {item.children.map((child) => (
            <SidebarNavItem
              key={child.to || child.labelKey}
              item={child}
              active={child.to && isActivePath ? isActivePath(child.to) : false}
              isActivePath={isActivePath}
              accent={false}
              collapsed={collapsed}
              domainPendingCount={domainPendingCount}
              onClick={onClick}
              t={t}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={[
        'app-sidebar-link',
        active && 'is-active',
        accent && 'is-admin',
        collapsed && 'is-collapsed',
        depth > 0 && 'app-sidebar-link--nested',
      ]
        .filter(Boolean)
        .join(' ')}
      title={collapsed ? t(item.labelKey) : undefined}
      aria-label={
        showDomainPending
          ? `${t(item.labelKey)} — ${t('domainsPageVerificationPending', { defaultValue: 'Verification pending' })}`
          : t(item.labelKey)
      }
    >
      <span className="app-sidebar-icon-slot">
        {item.isImage ? (
          <img
            src={item.icon}
            alt=""
            className={`app-sidebar-icon-img${item.iconImgClass ? ` ${item.iconImgClass}` : ''}`}
            draggable={false}
          />
        ) : item.icon ? (
          <Icon size={20} strokeWidth={2} />
        ) : null}
        {showDomainPending && collapsed ? (
          <span className="app-sidebar-pending-dot" aria-hidden />
        ) : null}
      </span>
      {!collapsed ? (
        <span className="app-sidebar-link-label">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="truncate">{t(item.labelKey)}</span>
            {showDomainPending ? (
              <PendingVerificationDot className="h-2 w-2 shrink-0" />
            ) : null}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export default function AppLayout({ children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { count: cartCount = 0 } = useCart() || {};
  const [isVaApplicant, setIsVaApplicant] = useState(false);
  const navItems = getNavItems(user, isVaApplicant);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const layoutScrollRef = useRef(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth < 1280;
    }
    return false;
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [referralPopup, setReferralPopup] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPanelStyle, setNotifPanelStyle] = useState(null);
  const [showClearNotifsConfirm, setShowClearNotifsConfirm] = useState(false);
  const [clearingNotifs, setClearingNotifs] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuStyle, setProfileMenuStyle] = useState(null);
  const [showInitial, setShowInitial] = useState(false);
  const [edgePoints, setEdgePoints] = useState(0);
  const [edgePointsWorthInr, setEdgePointsWorthInr] = useState(0);
  const vaCheckDoneRef = useRef(false);
  const onClick = () => {};
  const bellRef = useRef(null);
  const notifPanelRef = useRef(null);
  const profileRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notifFetchRef = useRef(0);

  const updateProfileMenuPosition = useCallback(() => {
    if (!profileRef.current) return;
    const rect = profileRef.current.getBoundingClientRect();
    const width = Math.min(200, window.innerWidth - 16);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + 8;
    const estimatedHeight = 280;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = rect.top - estimatedHeight - 8;
    }
    setProfileMenuStyle({
      position: 'fixed',
      top,
      left,
      width,
      zIndex: 10050,
    });
  }, []);

  useEffect(() => {
    const userKey = user?.id ?? user?.userId;
    if (!userKey) {
      setShowInitial(false);
      return undefined;
    }
    const startFlip = setTimeout(() => setShowInitial(true), 1000);
    const interval = setInterval(() => setShowInitial((prev) => !prev), 3000);
    return () => { clearTimeout(startFlip); clearInterval(interval); };
  }, [user?.id, user?.userId]);

  useEffect(() => {
    if (vaCheckDoneRef.current) return;
    if (!user || !user.id) return;
    const roleUpper = (user?.role ?? '').toString().toUpperCase();
    if (['ADMIN', 'ROLE_ADMIN', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'AUCTION_MODERATOR', 'ROLE_AUCTION_MODERATOR'].includes(roleUpper)) {
      vaCheckDoneRef.current = true;
      return;
    }
    vaCheckDoneRef.current = true;
    virtualAssistantAPI
      .getMy()
      .then((res) => {
        const data = unwrapApiData(res);
        if (data) setIsVaApplicant(true);
      })
      .catch(() => {});
  }, [user]);

  const updateNotifPanelPosition = useCallback(() => {
    const anchor = bellRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 16);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setNotifPanelStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width,
      zIndex: 10050,
    });
  }, []);

  useLayoutEffect(() => {
    if (!bellOpen) {
      setNotifPanelStyle(null);
      return undefined;
    }
    updateNotifPanelPosition();
    window.addEventListener('resize', updateNotifPanelPosition);
    window.addEventListener('scroll', updateNotifPanelPosition, true);
    return () => {
      window.removeEventListener('resize', updateNotifPanelPosition);
      window.removeEventListener('scroll', updateNotifPanelPosition, true);
    };
  }, [bellOpen, updateNotifPanelPosition]);
  
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const backTarget = getAppBackTarget(location.pathname);
  
  const displayName = resolveUserDisplayName(user);
  const userId = user?.id ?? user?.userId ?? null;
  const { pendingVerificationCount: domainPendingCount } = useDomainPendingVerification();

  const refreshUnreadCount = useCallback(() => {
    if (!userId) {
      setUnreadCount(0);
      return Promise.resolve();
    }
    return notificationAPI
      .getUnreadCount()
      .then((response) => setUnreadCount(unwrapApiData(response)?.count ?? 0))
      .catch(() => {});
  }, [userId]);

  const handleLiveNotification = useCallback((notification) => {
    if (!notification?.id) return;
    setNotifications((items) => {
      const exists = items.some((item) => item.id === notification.id);
      if (exists) return items;
      return [notification, ...items].slice(0, 15);
    });
    if (!notification.read) {
      setUnreadCount((count) => count + 1);
    }
    if (notification.type === 'REFERRAL_REWARD') {
      setReferralPopup(notification);
      fetchEdgePoints(); // refresh balance on reward
    }
  }, []);

  useNotificationSocket(userId, handleLiveNotification);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const fetchEdgePoints = useCallback(() => {
    if (!userId) return;
    api.get('/api/v1/edge-points/summary')
      .then(({ data }) => {
        if (data?.success) {
          setEdgePoints(data.data.current_points || 0);
          setEdgePointsWorthInr(data.data.worth_inr || 0);
        }
      })
      .catch((err) => console.error('Failed to load edge points summary:', err));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setNotifications([]);
      return undefined;
    }
    refreshUnreadCount();
    fetchEdgePoints();
    const interval = setInterval(() => {
      refreshUnreadCount();
      fetchEdgePoints();
    }, 30000);
    return () => clearInterval(interval);
  }, [userId, refreshUnreadCount, fetchEdgePoints]);

  // Close bell / profile menus on outside click (panel is portaled â€” include notifPanelRef)
  useEffect(() => {
    const handler = (e) => {
      const insideBell = bellRef.current?.contains(e.target);
      const insideNotifPanel = notifPanelRef.current?.contains(e.target);
      if (!insideBell && !insideNotifPanel) {
        setBellOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target) &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    updateProfileMenuPosition();
    const handleScroll = () => updateProfileMenuPosition();
    const handleResize = () => updateProfileMenuPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [profileMenuOpen, updateProfileMenuPosition]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  useEffect(() => {
    const root = layoutScrollRef.current;
    if (!root) return undefined;
    const onScroll = () => setHeaderScrolled(root.scrollTop > 16);
    onScroll();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  const handleBellOpen = () => {
    const opening = !bellOpen;
    setBellOpen(opening);

    if (!opening || !userId) return;

    const fetchId = ++notifFetchRef.current;
    setNotifLoading(true);

    Promise.all([
      notificationAPI.getRecent().then((response) => unwrapApiList(response)),
      refreshUnreadCount(),
    ])
      .then(([items]) => {
        if (fetchId !== notifFetchRef.current) return;
        setNotifications(items);
      })
      .catch(() => {})
      .finally(() => {
        if (fetchId === notifFetchRef.current) {
          setNotifLoading(false);
        }
      });
  };

  const handleClearAllNotifications = () => {
    if (notifications.length === 0) return;
    setShowClearNotifsConfirm(true);
  };

  const confirmClearAllNotifications = async () => {
    setClearingNotifs(true);
    try {
      await notificationAPI.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
      setShowClearNotifsConfirm(false);
    } catch {
      // keep existing list on failure
    } finally {
      setClearingNotifs(false);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      notificationAPI.markOneRead(notification.id).catch(() => {});
    }
    setBellOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // ─── PUBLIC LAYOUT (unauthenticated visitors) ─────────────────────────────
  // When no user is logged in, render the same public header/footer as the
  // home page instead of the dashboard sidebar + authenticated shell.
  if (!user) {
    return (
      <div className="relative min-w-0 bg-white overflow-visible">
        {/* Top bar is shown on every breakpoint (same as the Home page) so the
            profile avatar → Sign In / Sign Out control is available on mobile
            listing pages, not just inside the hamburger drawer. */}
        <TopNavbar hideContactUs isScrolled={false} />
        <HomeNavbar
          navRef={{ current: null }}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          navigate={navigate}
          isScrolled={false}
        />
        <main className="min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <HomeFooter />
      </div>
    );
  }

  // ─── AUTHENTICATED DASHBOARD LAYOUT ───────────────────────────────────────
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-gray-50">
      <div className="app-layout-workspace flex w-full flex-1 items-stretch">
      {/* Desktop Left Sidebar â€” workspace only; ends above full-width footer */}
      <aside
        className={`app-chrome-panel app-layout-sidebar app-sidebar hidden lg:flex min-h-full flex-col flex-shrink-0 self-stretch ${
          sidebarCollapsed ? 'is-collapsed w-[4.75rem]' : 'w-[15.5rem]'
        }`}
      >
        <div className="app-sidebar-header">
          {!sidebarCollapsed && (
            <Link to="/" className="app-sidebar-logo-link brand-logo-interactive">
              <BrandNavLogo />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="app-sidebar-toggle"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft
              size={20}
              className={sidebarCollapsed ? 'rotate-180' : ''}
              strokeWidth={2}
            />
          </button>
        </div>

        <div className="app-sidebar-body">
          <nav className="app-sidebar-nav" aria-label="Main navigation">
            {!sidebarCollapsed && <p className="app-sidebar-section-label">{t('navMenu')}</p>}
            <div className="app-sidebar-nav-list">
              {navItems.map((item) => (
                <SidebarNavItem
                  key={item.to || item.labelKey}
                  item={item}
                  active={item.to ? isActive(item.to) : false}
                  isActivePath={isActive}
                  accent={item.adminAccent}
                  collapsed={sidebarCollapsed}
                  domainPendingCount={domainPendingCount}
                  onClick={onClick}
                  t={t}
                />
              ))}
            </div>
          </nav>

          <div className="app-sidebar-footer">
            {!sidebarCollapsed && <p className="app-sidebar-section-label">{t('accountSection')}</p>}
            <div className="app-sidebar-footer-inner">
            <Link
              to="/"
              className={[
                'app-sidebar-link app-sidebar-link--footer',
                sidebarCollapsed && 'is-collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              title={sidebarCollapsed ? t('Home') : ''}
            >
              <span className="app-sidebar-icon-slot">
                <Home size={20} strokeWidth={2} />
              </span>
              {!sidebarCollapsed && <span className="app-sidebar-link-label">{t('Home')}</span>}
            </Link>
            <Link
              to="/cart"
              className={[
                'app-sidebar-link app-sidebar-link--footer',
                isActive('/cart') && 'is-active',
                sidebarCollapsed && 'is-collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              title={sidebarCollapsed ? t('cart', { defaultValue: 'Cart' }) : ''}
            >
              <span className="app-sidebar-icon-slot">
                <ShoppingCart size={20} strokeWidth={2} />
              </span>
              {!sidebarCollapsed && (
                <span className="app-sidebar-link-label">{t('cart', { defaultValue: 'Cart' })}</span>
              )}
              {cartCount > 0 && (
                <span className={`app-sidebar-badge${sidebarCollapsed ? '' : ' ml-auto'}`}>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={handleBellOpen}
              className={[
                'app-sidebar-link app-sidebar-link--footer',
                sidebarCollapsed && 'is-collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              title={sidebarCollapsed ? t('notifications') : ''}
            >
              <span className="app-sidebar-icon-slot">
                <Bell size={20} strokeWidth={2} />
              </span>
              {!sidebarCollapsed && (
                <span className="app-sidebar-link-label">{t('notifications')}</span>
              )}
              {unreadCount > 0 && (
                <span className={`app-sidebar-badge${sidebarCollapsed ? '' : ' ml-auto'}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <Link
              to="/edge-points"
              className={[
                'app-sidebar-link app-sidebar-link--footer',
                isActive('/edge-points') && 'is-active',
                sidebarCollapsed && 'is-collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              title={sidebarCollapsed ? 'Edge Points' : ''}
            >
              <span className="app-sidebar-icon-slot">
                <Award size={20} strokeWidth={2} />
              </span>
              {!sidebarCollapsed && (
                <span className="app-sidebar-link-label flex flex-col items-start leading-tight">
                  <span>Edge Points</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{edgePoints} Points · Worth ₹{edgePointsWorthInr}</span>
                </span>
              )}
            </Link>
            <Link
              to="/complete-profile"
              className={[
                'app-sidebar-link app-sidebar-link--footer',
                sidebarCollapsed && 'is-collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              title={sidebarCollapsed ? t('updateProfile') : ''}
            >
              <span className="app-sidebar-icon-slot">
                <User size={20} strokeWidth={2} />
              </span>
              {!sidebarCollapsed && (
                <span className="app-sidebar-link-label">{t('updateProfile')}</span>
              )}
            </Link>
            <div className="app-sidebar-account-divider" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className={[
                'app-sidebar-link app-sidebar-link--footer app-sidebar-link--logout',
                sidebarCollapsed && 'is-collapsed',
              ]
                .filter(Boolean)
                .join(' ')}
              title={sidebarCollapsed ? t('logout') : ''}
            >
              <span className="app-sidebar-icon-slot">
                <LogOut size={20} strokeWidth={2} />
              </span>
              {!sidebarCollapsed && <span className="app-sidebar-link-label">{t('logout')}</span>}
            </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="app-sidebar-backdrop lg:hidden fixed inset-0 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="app-chrome-panel app-sidebar app-sidebar--drawer lg:hidden fixed inset-y-0 left-0 flex flex-col">
            <div className="app-sidebar-header">
              <Link to="/" className="app-sidebar-logo-link brand-logo-interactive" onClick={() => setMobileOpen(false)}>
                <BrandNavLogo />
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="app-sidebar-close"
                aria-label="Close menu"
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>

            <div className="app-sidebar-body">
              <nav className="app-sidebar-nav" aria-label="Main navigation">
                <p className="app-sidebar-section-label">{t('navMenu')}</p>
                <div className="app-sidebar-nav-list">
                  {navItems.map((item) => (
                    <SidebarNavItem
                      key={item.to || item.labelKey}
                      item={item}
                      active={item.to ? isActive(item.to) : false}
                      isActivePath={isActive}
                      accent={item.adminAccent}
                      collapsed={false}
                      domainPendingCount={domainPendingCount}
                      onClick={() => setMobileOpen(false)}
                      t={t}
                    />
                  ))}
                </div>
              </nav>

              <div className="app-sidebar-footer">
                <p className="app-sidebar-section-label">{t('accountSection')}</p>
                <div className="app-sidebar-footer-inner">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="app-sidebar-link app-sidebar-link--footer"
                >
                  <span className="app-sidebar-icon-slot">
                    <Home size={20} strokeWidth={2} />
                  </span>
                  <span className="app-sidebar-link-label">{t('Home')}</span>
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setMobileOpen(false)}
                  className={[
                    'app-sidebar-link app-sidebar-link--footer',
                    isActive('/cart') && 'is-active',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="app-sidebar-icon-slot">
                    <ShoppingCart size={20} strokeWidth={2} />
                  </span>
                  <span className="app-sidebar-link-label">{t('cart', { defaultValue: 'Cart' })}</span>
                  {cartCount > 0 && (
                    <span className="app-sidebar-badge ml-auto">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={handleBellOpen}
                  className="app-sidebar-link app-sidebar-link--footer"
                >
                  <span className="app-sidebar-icon-slot">
                    <Bell size={20} strokeWidth={2} />
                  </span>
                  <span className="app-sidebar-link-label">{t('notifications')}</span>
                  {unreadCount > 0 && (
                    <span className="app-sidebar-badge ml-auto">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <Link
                  to="/edge-points"
                  onClick={() => setMobileOpen(false)}
                  className="app-sidebar-link app-sidebar-link--footer"
                >
                  <span className="app-sidebar-icon-slot">
                    <Award size={20} strokeWidth={2} />
                  </span>
                  <span className="app-sidebar-link-label flex flex-col items-start leading-tight">
                    <span>Edge Points</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{edgePoints} Points · Worth ₹{edgePointsWorthInr}</span>
                  </span>
                </Link>
                <Link
                  to="/complete-profile"
                  onClick={() => setMobileOpen(false)}
                  className="app-sidebar-link app-sidebar-link--footer"
                >
                  <span className="app-sidebar-icon-slot">
                    <User size={20} strokeWidth={2} />
                  </span>
                  <span className="app-sidebar-link-label">{t('updateProfile')}</span>
                </Link>
                <div className="app-sidebar-account-divider" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="app-sidebar-link app-sidebar-link--footer app-sidebar-link--logout"
                >
                  <span className="app-sidebar-icon-slot">
                    <LogOut size={20} strokeWidth={2} />
                  </span>
                  <span className="app-sidebar-link-label">{t('logout')}</span>
                </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main column: header + page content (footer is outside workspace) */}
      <div className="app-layout-main-column flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className={`app-layout-header z-30 shrink-0 border-b border-gray-200 bg-white/95 px-3 py-3 sm:px-4 sm:py-4 lg:px-8 flex items-center justify-between gap-2 overflow-visible backdrop-blur-md${headerScrolled ? ' is-scrolled' : ''}`}>
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden sm:gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 shrink-0"
            >
              <Menu size={24} />
            </button>

            {backTarget && (
              <BackButton to={backTarget.to} label={backTarget.label} className="shrink-0" />
            )}

            <Link
              to="/"
              className={`brand-logo-interactive items-center shrink-0 ${
                sidebarCollapsed ? 'flex app-layout-collapsed-brand' : 'flex lg:hidden app-layout-mobile-brand'
              }`}
              aria-label="Deltapreneur home"
            >
              <BrandNavLogo />
            </Link>
          </div>

          <div className="app-layout-header-actions flex items-center gap-1.5 shrink-0 sm:gap-3">
            <div
              className="app-layout-header-utils home-nav-util-group max-xl:hidden xl:flex"
              role="group"
              aria-label="Regional settings"
            >
              <a href={SUPPORT_PHONE_TEL} className="home-nav-phone-number whitespace-nowrap">
                {SUPPORT_PHONE_DISPLAY}
              </a>
              <span className="home-nav-util-divider" aria-hidden="true">
                |
              </span>
              <LanguageDropdown variant="minimal" className="home-nav-util-language" />
              <span className="home-nav-util-divider" aria-hidden="true">
                |
              </span>
              <CurrencyDropdown variant="minimal" className="home-nav-util-currency" />
            </div>
            {/* Bell â€” always visible on mobile/tablet */}
            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleBellOpen();
                }}
                className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={t('notifications')}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen &&
                notifPanelStyle &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    ref={notifPanelRef}
                    className="app-notif-dropdown bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
                    style={notifPanelStyle}
                    role="dialog"
                    aria-label={t('notifications')}
                  >
                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 gap-2">
                      <span className="font-semibold text-sm text-gray-900">{t('notifications')}</span>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-700 shrink-0 whitespace-nowrap font-medium"
                          onClick={handleClearAllNotifications}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="max-h-[min(380px,calc(100vh-8rem))] overflow-y-auto">
                      {notifLoading && notifications.length === 0 ? (
                        <div className="py-8 px-4 text-center text-gray-500 text-sm">
                          {t('loading', { defaultValue: 'Loading…' })}
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="py-8 px-4 text-center text-gray-500 text-sm">
                          {t('noNotificationsYet')}
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                              !notification.read ? 'bg-blue-50/50' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                              {notification.type?.includes('LIKE') ? '❤️'
                               : notification.type?.includes('VERIFIED') ? '✓'
                               : notification.type?.includes('VENTURE') ? '🤝'
                               : notification.type?.includes('DOMAIN') ? '🌐'
                               : notification.type?.includes('AUCTION') ? '🔨' : '🔔'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 mb-0.5">
                                {notification.title || notification.message}
                              </div>
                              {notification.title && notification.message && notification.message !== notification.title && (
                              <div className="text-xs text-gray-500 line-clamp-2">
                                {notification.message}
                              </div>
                              )}
                              <div className="text-[10px] text-gray-400 mt-1">
                                {timeAgo(notification.createdAt)}
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-3 border-t border-gray-100 text-center">
                      <Link
                        to="/notifications"
                        onClick={() => setBellOpen(false)}
                        className="inline-block w-full py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                      >
                        {t('viewAllNotifications')}
                      </Link>
                    </div>
                  </div>,
                  document.body,
                )}
            </div>

            {/* Cart â€” visible when logged in, right of bell */}
            {user && <CartButton />}

            {/* Mobile / tablet: round profile â†’ accordion language & currency */}
            <div className="relative shrink-0 xl:hidden" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setBellOpen(false);
                  setProfileMenuOpen((open) => {
                    if (!open) {
                      setTimeout(updateProfileMenuPosition, 0);
                    }
                    return !open;
                  });
                }}
                className="app-profile-avatar-btn relative block h-10 w-10 shrink-0 cursor-pointer rounded-full border-2 border-slate-300 bg-white p-0 aspect-square shadow-sm no-underline transition-[box-shadow,border-color] duration-300 hover:border-indigo-500 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
                aria-label="Account and regional settings"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div className="home-profile-flip-scene w-full h-full" aria-hidden="true">
                  <div className={`home-profile-flip-inner${showInitial ? ' is-flipped' : ''} w-full h-full`}>
                    <div className="home-profile-flip-face home-profile-flip-face--front flex items-center justify-center w-full h-full bg-white rounded-full overflow-hidden">
                      <img
                        src={CreatorIcon}
                        alt=""
                        className="w-[90%] h-[90%] object-contain"
                        draggable={false}
                      />
                    </div>
                    <div className="home-profile-flip-face home-profile-flip-face--back flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-lg">
                      <span className="home-profile-flip-initial">{displayName.charAt(0)}</span>
                    </div>
                  </div>
                </div>
              </button>
              {profileMenuOpen && profileMenuStyle &&
                createPortal(
                  <div
                    ref={profileMenuRef}
                    className="fixed bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                    style={profileMenuStyle}
                    role="menu"
                  >
                    <AppProfileRegionalMenu
                      key="profile-regional"
                      displayName={displayName}
                      email={user?.email}
                    />
                  </div>,
                  document.body
                )}
            </div>

            {/* Desktop (xl+): language/currency in header + profile label */}
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-gray-200 sm:gap-3">
              <div className="app-profile-avatar-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full aspect-square bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold leading-none text-white">
                {displayName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">{user?.role || 'USER'}</p>
              </div>
            </div>
          </div>
        </header>

        <div
          ref={layoutScrollRef}
          data-app-layout-scroll
          className="app-layout-scroll-body flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 min-w-0"
        >
          <div className="app-main-content min-w-0 max-w-[100%] flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:p-5 lg:p-6 xl:p-8">
            {children}
          </div>
          <HomeFooter />
        </div>
      </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-logout-confirm-title"
        >
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 id="app-logout-confirm-title" className="text-lg font-bold text-gray-900 mb-2">
              {t('confirmLogout')}
            </h3>
            <p className="text-gray-600 text-sm mb-6">{t('confirmLogoutMessage')}</p>
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <button
                type="button"
                className="w-full sm:flex-1 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="w-full sm:flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
                onClick={handleLogout}
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={showClearNotifsConfirm}
        title="Clear all notifications?"
        message="Once cleared, this cannot be reverted."
        confirmLabel="Clear all"
        cancelLabel="Cancel"
        variant="red"
        loading={clearingNotifs}
        loadingLabel="Clearing..."
        zIndex={10100}
        onCancel={() => {
          if (!clearingNotifs) setShowClearNotifsConfirm(false);
        }}
        onConfirm={confirmClearAllNotifications}
      />
      {/* Referral Reward Congratulations Overlay */}
      {referralPopup && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-indigo-500 to-emerald-400" />
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h3 className="text-2xl font-black tracking-tight text-white mb-2">Congratulations!</h3>
            <p className="text-[13px] text-slate-300 leading-relaxed mb-6 whitespace-pre-line">
              {referralPopup.message || "You have successfully earned 20 Edge Points!\n\nYour wallet has been updated."}
            </p>
            <button
              onClick={() => setReferralPopup(null)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30"
            >
              Great!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
