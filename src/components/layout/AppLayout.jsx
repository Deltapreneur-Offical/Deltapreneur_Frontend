import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatTimeAgo } from '../../utils/timeAgo';
import { Home, Handshake, Globe, Gavel, ShoppingBag, User, Bell, LogOut, Menu, X, PanelLeft, Shield, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../api/services';
import { unwrapApiData, unwrapApiList } from '../../utils/apiResponse';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';
import coBrotherLogo from '../../assets/Cobrother_Green.png';
import TechnologyIcon from '../../assets/CoCreation.png';
import CommunityIcon from '../../assets/Community-profileicon-gray.png';
import CurrencyDropdown from '../common/CurrencyDropdown';
import LanguageDropdown from '../common/LanguageDropdown';
import HomeFooter from '../common/HomeFooter';
import BackButton from '../common/BackButton';
import { getAppBackTarget } from '../../utils/appNavigation';

const sidebarItems = [
  { icon: Home, labelKey: 'dashboard', to: '/dashboard', isImage: false },
  { icon: Globe, labelKey: 'domains', to: '/domains', isImage: false },
  { icon: Store, labelKey: 'storefront', to: '/storefront', isImage: false },
  { icon: Handshake, labelKey: 'coVentures', to: '/ventures', isImage: false },
  { icon: TechnologyIcon, labelKey: 'technology', to: '/technology', isImage: true, iconImgClass: 'app-sidebar-icon-img--technology' },
  {
    icon: CommunityIcon,
    labelKey: 'creator',
    to: '/creator',
    isImage: true,
    iconImgClass: 'app-sidebar-icon-img--disruptor',
  },
  { icon: Gavel, labelKey: 'auctions', to: '/auctions', isImage: false },
  { icon: ShoppingBag, labelKey: 'purchases', to: '/purchases', isImage: false },
];

const adminNavItem = { icon: Shield, labelKey: 'navAdminPanel', to: '/admin', isImage: false, adminAccent: true };

function isAdminUser(user) {
  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  return roleUpper === 'ADMIN' || roleUpper === 'ROLE_ADMIN';
}

function getNavItems(user) {
  if (!isAdminUser(user)) return sidebarItems;
  const purchasesIdx = sidebarItems.findIndex((item) => item.to === '/purchases');
  const insertAt = purchasesIdx >= 0 ? purchasesIdx + 1 : sidebarItems.length;
  return [...sidebarItems.slice(0, insertAt), adminNavItem, ...sidebarItems.slice(insertAt)];
}

export default function AppLayout({ children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navItems = getNavItems(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
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
  const bellRef = useRef(null);
  
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const backTarget = getAppBackTarget(location.pathname);
  
  const firstName = user?.firstname || user?.firstName || user?.name || user?.email?.split('@')[0] || 'User';
  const userId = user?.id ?? user?.userId ?? null;

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
  }, []);

  useNotificationSocket(userId, handleLiveNotification);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setNotifications([]);
      return undefined;
    }
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId, refreshUnreadCount]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const handleBellOpen = async () => {
    const opening = !bellOpen;
    if (opening && userId) {
      try {
        const items = unwrapApiList(await notificationAPI.getRecent());
        setNotifications(items);
        await refreshUnreadCount();
      } catch {
        // keep existing panel state
      }
    }
    setBellOpen(opening);
  };

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllRead();
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await notificationAPI.markOneRead(notification.id);
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setBellOpen(false);
    if (notification.link) navigate(notification.link);
  };


  return (
    <div
      className="flex min-h-screen flex-col overflow-x-hidden overflow-y-auto bg-gray-50"
      data-app-layout-scroll
    >
      <div className="app-layout-workspace flex w-full flex-1 items-stretch">
      {/* Desktop Left Sidebar — workspace only; ends above full-width footer */}
      <aside
        className={`app-layout-sidebar app-sidebar hidden lg:flex min-h-full flex-col flex-shrink-0 self-stretch ${
          sidebarCollapsed ? 'is-collapsed w-[4.75rem]' : 'w-[15.5rem]'
        }`}
      >
        <div className="app-sidebar-header">
          {!sidebarCollapsed && (
            <Link to="/" className="app-sidebar-logo-link">
              <img src={coBrotherLogo} alt="CoBrother" className="brand-nav-logo" />
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

        <nav className="app-sidebar-nav" aria-label="Main navigation">
          {!sidebarCollapsed && <p className="app-sidebar-section-label">Menu</p>}
          <div className="app-sidebar-nav-list">
            {navItems.map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;
              const accent = item.adminAccent;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    'app-sidebar-link',
                    active && 'is-active',
                    accent && 'is-admin',
                    sidebarCollapsed && 'is-collapsed',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  title={sidebarCollapsed ? t(item.labelKey) : ''}
                >
                  <span className="app-sidebar-icon-slot">
                    {item.isImage ? (
                      <img
                        src={item.icon}
                        alt={t(item.labelKey)}
                        className={`app-sidebar-icon-img${item.iconImgClass ? ` ${item.iconImgClass}` : ''}`}
                        draggable={false}
                      />
                    ) : (
                      <Icon size={20} strokeWidth={2} />
                    )}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="app-sidebar-link-label">{t(item.labelKey)}</span>
                  )}
                </Link>
              );
            })}
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
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="app-sidebar-backdrop lg:hidden fixed inset-0 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="app-sidebar app-sidebar--drawer lg:hidden fixed inset-y-0 left-0 flex flex-col">
            <div className="app-sidebar-header">
              <Link to="/" className="app-sidebar-logo-link" onClick={() => setMobileOpen(false)}>
                <img src={coBrotherLogo} alt="CoBrother" className="brand-nav-logo" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="app-sidebar-close"
                aria-label={t('closeMenu')}
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>

            <nav className="app-sidebar-nav" aria-label="Main navigation">
              <p className="app-sidebar-section-label">{t('navMenu')}</p>
              <div className="app-sidebar-nav-list">
                {navItems.map((item) => {
                  const active = isActive(item.to);
                  const Icon = item.icon;
                  const accent = item.adminAccent;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        'app-sidebar-link',
                        active && 'is-active',
                        accent && 'is-admin',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="app-sidebar-icon-slot">
                        {item.isImage ? (
                          <img
                        src={item.icon}
                        alt={t(item.labelKey)}
                        className={`app-sidebar-icon-img${item.iconImgClass ? ` ${item.iconImgClass}` : ''}`}
                        draggable={false}
                      />
                        ) : (
                          <Icon size={20} strokeWidth={2} />
                        )}
                      </span>
                      <span className="app-sidebar-link-label">{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
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
                  to="/complete-profile"
                  onClick={() => setMobileOpen(false)}
                  className="app-sidebar-link app-sidebar-link--footer"
                >
                  <span className="app-sidebar-icon-slot">
                    <User size={20} strokeWidth={2} />
                  </span>
                  <span className="app-sidebar-link-label">{t('updateProfile')}</span>
                </Link>
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
          </aside>
        </>
      )}

      {/* Main column: header + page content (footer is outside workspace) */}
      <div className="app-layout-main-column flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white px-4 py-4 lg:px-8 flex items-center justify-between relative">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 shrink-0"
            >
              <Menu size={24} />
            </button>

            {backTarget && (
              <BackButton to={backTarget.to} label={backTarget.label} className="shrink-0" />
            )}

            <Link to="/" className="lg:hidden flex items-center shrink-0">
              <img src={coBrotherLogo} alt="CoBrother" className="brand-nav-logo" />
            </Link>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="app-layout-header-utils home-nav-util-group" role="group" aria-label="Regional settings">
              <LanguageDropdown variant="minimal" className="home-nav-util-language" />
              <span className="home-nav-util-divider" aria-hidden="true">
                |
              </span>
              <CurrencyDropdown variant="minimal" className="home-nav-util-currency" />
            </div>
            {/* Working Bell Icon with Notification Panel */}
            <div className="relative" ref={bellRef}>
              <button 
                onClick={handleBellOpen}
                className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {bellOpen && (
                <div className="absolute top-full right-0 mt-2 w-[360px] bg-white border border-gray-200 rounded-xl shadow-2xl z-[1000] overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-sm text-gray-900">{t('notifications')}</span>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-gray-500 hover:text-gray-700"
                        onClick={handleMarkAllRead}
                      >
                        {t('markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {notifications.length === 0 ? (
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
                              {formatTimeAgo(notification.createdAt, t)}
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
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      {t('viewAllNotifications')}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-gray-900">{firstName}</p>
                <p className="text-xs text-gray-500">{user?.role || 'USER'}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="app-layout-scroll-body flex flex-1 flex-col bg-gray-50 min-w-0">
          <div className="app-main-content min-w-0 max-w-[100%] flex-1 p-4 sm:p-5 lg:p-6 xl:p-8">
            {children}
          </div>
        </div>
      </div>
      </div>

      <HomeFooter />

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
    </div>
  );
}
