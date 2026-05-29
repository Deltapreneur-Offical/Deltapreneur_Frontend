import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Home, Handshake, Users, Globe, Zap, Gavel, ShoppingBag, Settings, Bell, LogOut, Menu, X, Shield, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import coBrotherLogo from '../../assets/Cobrother_logo.png';
import TopNavbar from '../common/TopNavbar';

const sidebarItems = [
  { icon: Home, label: 'Dashboard', to: '/dashboard' },
  { icon: Globe, label: 'Domains', to: '/domains' },
  { icon: Store, label: 'Storefront', to: '/storefront' },
  { icon: Handshake, label: 'Ventures', to: '/ventures' },
  { icon: Zap, label: 'Technology', to: '/cocreation' },
  { icon: Users, label: 'Disruptor', to: '/community' },
  { icon: Gavel, label: 'Auctions', to: '/auctions' },
  { icon: ShoppingBag, label: 'Purchases', to: '/purchases' },
];

const adminNavItem = { icon: Shield, label: 'Admin panel', to: '/admin', adminAccent: true };

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

export default function SidebarLayout({ children }) {
  const { user, logout } = useAuth();
  const navItems = getNavItems(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  
  const firstName = user?.firstname || user?.firstName || user?.name || user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0f0f1a] flex-col flex-shrink-0 h-screen sticky top-0">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <Link to="/dashboard" className="flex items-center">
            <img src={coBrotherLogo} alt="CoBrother" className="h-8 w-auto" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            const accent = item.adminAccent;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  accent
                    ? active
                      ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-400/30'
                      : 'text-indigo-300/90 hover:bg-indigo-500/15 hover:text-indigo-100 border border-transparent'
                    : active
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} className={accent ? (active ? 'text-indigo-300' : 'text-indigo-400/80') : active ? 'text-indigo-400' : ''} />
                <span className="font-medium text-[0.9375rem]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all w-full">
            <Bell size={20} />
            <span className="font-medium text-sm">Notifications</span>
          </button>
          <Link
            to="/complete-profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Settings size={20} />
            <span className="font-medium text-sm">Settings</span>
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 w-64 bg-[#0f0f1a] flex-col flex-shrink-0 h-screen z-50">
            {/* Logo */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center">
                <img src={coBrotherLogo} alt="CoBrother" className="h-8 w-auto" />
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                const accent = item.adminAccent;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      accent
                        ? active
                          ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-400/30'
                          : 'text-indigo-300/90 hover:bg-indigo-500/15 hover:text-indigo-100'
                        : active
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={20} className={accent ? (active ? 'text-indigo-300' : 'text-indigo-400/80') : active ? 'text-indigo-400' : ''} />
                    <span className="font-medium text-[0.9375rem]">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-white/10 space-y-1">
              <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all w-full">
                <Bell size={20} />
                <span className="font-medium text-sm">Notifications</span>
              </button>
              <Link
                to="/complete-profile"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              >
                <Settings size={20} />
                <span className="font-medium text-sm">Settings</span>
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all w-full"
              >
                <LogOut size={20} />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            
            {/* Logo for mobile */}
            <Link to="/dashboard" className="lg:hidden flex items-center">
              <img src={coBrotherLogo} alt="CoBrother" className="h-7 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <Bell size={20} />
            </button>
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-gray-600 text-sm mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
