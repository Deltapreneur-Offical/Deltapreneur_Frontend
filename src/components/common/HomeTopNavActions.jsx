import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import cobrotherProfile from '../../assets/cobrother_community_profil.png';
import CurrencyDropdown from './CurrencyDropdown';
import LanguageDropdown from './LanguageDropdown';

const ProfileFlipAvatar = memo(function ProfileFlipAvatar({ flipped, userInitial }) {
  return (
    <div className="home-profile-flip-scene" aria-hidden="true">
      <div className={`home-profile-flip-inner${flipped ? ' is-flipped' : ''}`}>
        <div className="home-profile-flip-face home-profile-flip-face--front">
          <img
            src={cobrotherProfile}
            alt=""
            className="home-profile-flip-icon"
            draggable={false}
          />
        </div>
        <div className="home-profile-flip-face home-profile-flip-face--back">
          <span className="home-profile-flip-initial">{userInitial}</span>
        </div>
      </div>
    </div>
  );
});

function getUserInitialFromUser(user) {
  if (!user) return '';
  return (
    user.fullName?.charAt(0)?.toUpperCase() ||
    user.name?.charAt(0)?.toUpperCase() ||
    user.email?.charAt(0)?.toUpperCase() ||
    'U'
  );
}

function getDisplayNameFromUser(user) {
  if (!user) return 'User';
  const fName = user.firstName || user.firstname || user.FIRSTNAME || user.FirstName || '';
  const lName = user.lastName || user.lastname || user.LASTNAME || user.LastName || '';
  const full = user.fullName || user.fullname || user.FULLNAME || user.name || user.NAME || user.Name || '';
  if (full) return full;
  if (fName && lName) return `${fName} ${lName}`;
  if (fName) return fName;
  if (lName) return lName;
  if (user.email) {
    const username = user.email.split('@')[0].replace(/\./g, ' ');
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  return 'User';
}

export default function HomeTopNavActions() {
  const { t } = useTranslation();
  const { user, logout, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showInitial, setShowInitial] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileRef = useRef(null);

  const userKey = user?.id ?? user?.email ?? null;

  const userInitial = useMemo(
    () => getUserInitialFromUser(user),
    [user?.fullName, user?.name, user?.email],
  );

  const displayName = useMemo(() => getDisplayNameFromUser(user), [user]);

  useEffect(() => {
    if (!showLogoutConfirm) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showLogoutConfirm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Only refresh an existing session — do not fetch /me for guests or a
    // stale token will populate user state and look like a surprise login.
    if (profileDropdownOpen && refreshUser && userKey) {
      refreshUser();
    }
  }, [profileDropdownOpen, refreshUser, userKey]);

  useEffect(() => {
    if (!userKey) {
      setShowInitial(false);
      return undefined;
    }

    const startFlip = setTimeout(() => setShowInitial(true), 1000);
    const interval = setInterval(() => setShowInitial((prev) => !prev), 3000);

    return () => {
      clearTimeout(startFlip);
      clearInterval(interval);
    };
  }, [userKey]);

  const handleLogoutConfirm = useCallback(async () => {
    setShowLogoutConfirm(false);
    setProfileDropdownOpen(false);
    await logout();
    navigate('/');
  }, [logout, navigate]);

  const goToLogin = useCallback(() => {
    setProfileDropdownOpen(false);
    navigate('/login', { state: { showLoginForm: true } });
  }, [navigate]);

  const toggleProfileDropdown = useCallback(() => {
    setProfileDropdownOpen((prev) => !prev);
  }, []);

  return (
    <>
      <div className="home-nav-util-group" role="group" aria-label="Regional settings">
        <LanguageDropdown variant="minimal" className="home-nav-util-language" />
        <span className="home-nav-util-divider" aria-hidden="true">
          |
        </span>
        <CurrencyDropdown variant="minimal" className="home-nav-util-currency" />
      </div>

      <div className="relative hidden xl:block">
        <a href="/contact" className="home-nav-contact-link">
          {t('contactUs')}
        </a>
      </div>

      <div className="home-top-nav-profile relative shrink-0" ref={profileRef}>
        <button
          type="button"
          className="home-top-nav-profile-btn relative block h-8 w-8 shrink-0 cursor-pointer rounded-full border-2 border-slate-300 bg-white p-0 shadow-sm no-underline transition-[box-shadow,border-color] duration-300 hover:border-slate-400 hover:bg-white hover:shadow-md focus:outline-none md:h-9 md:w-9"
          onClick={toggleProfileDropdown}
          aria-label="Account menu"
          aria-expanded={profileDropdownOpen}
        >
          {userKey ? (
            <ProfileFlipAvatar flipped={showInitial} userInitial={userInitial} />
          ) : (
            <div className="home-profile-flip-scene" aria-hidden="true">
              <div className="home-profile-flip-face home-profile-flip-face--front home-profile-flip-face--static">
                <img
                  src={cobrotherProfile}
                  alt=""
                  className="home-profile-flip-icon"
                  draggable={false}
                />
              </div>
            </div>
          )}
        </button>

        {profileDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[11rem] overflow-visible z-[1001]">
            {user ? (
              <>
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <a
                  href="/dashboard"
                  className="menu-item-gradient block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline font-medium"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {t('dashboard')}
                </a>
                <a
                  href="/contact"
                  className="menu-item-gradient block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline font-medium xl:hidden"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {t('contactUs')}
                </a>
                <a
                  href="/complete-profile"
                  className="menu-item-gradient block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline font-medium"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {t('updateProfile')}
                </a>
                <a
                  href="/security/password"
                  className="menu-item-gradient block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline font-medium"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  Password & Security
                </a>
                <div className="border-t border-gray-100">
                  <button
                    type="button"
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    {t('logout')}
                  </button>
                </div>
              </>
            ) : authLoading ? (
              <div className="px-4 py-2.5 text-sm text-gray-400">…</div>
            ) : (
              <>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={goToLogin}
                >
                  {t('signIn')}
                </button>
                <a
                  href="/contact"
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors no-underline xl:hidden"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {t('contactUs')}
                </a>
              </>
            )}
          </div>
        )}
      </div>

      {showLogoutConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-logout-confirm-title"
          >
            <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
              <h3 id="home-logout-confirm-title" className="text-lg font-bold text-gray-900">
                {t('confirmLogout')}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{t('confirmLogoutMessage')}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <button
                  type="button"
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
                  onClick={handleLogoutConfirm}
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
