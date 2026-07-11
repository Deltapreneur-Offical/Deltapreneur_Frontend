import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import cobrotherProfile from '../../assets/cobrother_community_profil.png';
import CurrencyDropdown from './CurrencyDropdown';
import LanguageDropdown from './LanguageDropdown';
import {
  EXTERNAL_LINK_PROPS,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  WHATSAPP_URL,
} from '../../config/contactLinks';

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

function WhatsAppNavButton() {
  return (
    <a
      href={WHATSAPP_URL}
      {...EXTERNAL_LINK_PROPS}
      className="home-nav-whatsapp-btn home-nav-contact-icon-btn"
      aria-label="WhatsApp"
      title="WhatsApp"
    >
      <FaWhatsapp aria-hidden />
    </a>
  );
}

function CallNavButton() {
  return (
    <a
      href={SUPPORT_PHONE_TEL}
      className="home-nav-call-btn home-nav-contact-icon-btn"
      aria-label="Call CoBrother support"
      title="Call CoBrother support"
    >
      <FaPhoneAlt aria-hidden />
    </a>
  );
}

function HomeNavToolbarSeparator({ variant = 'desktop' }) {
  return (
    <span
      className={`home-nav-toolbar-separator home-nav-toolbar-separator--${variant}`}
      aria-hidden="true"
    >
      |
    </span>
  );
}

function SupportLabel({ className = 'home-nav-support-label' }) {
  const { t } = useTranslation();

  return (
    <span className={className}>
      <span className="home-nav-support-prefix">{t('navSupport24/7')}</span>
      <span className="home-nav-support-emphasis">{t('navSupportLabel')}</span>
    </span>
  );
}

export default function HomeTopNavActions({ hideContactUs = false } = {}) {
  const { t } = useTranslation();
  const { user, logout, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showInitial, setShowInitial] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const profileRef = useRef(null);
  const dropdownRef = useRef(null);

  const userKey = user?.id ?? user?.email ?? null;

  const userInitial = useMemo(
    () => getUserInitialFromUser(user),
    [user?.fullName, user?.name, user?.email],
  );

  const displayName = useMemo(() => getDisplayNameFromUser(user), [user]);

  const updateDropdownPosition = useCallback(() => {
    if (!profileRef.current) return;
    const rect = profileRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(220, window.innerWidth - 16);
    let left = rect.right - dropdownWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - dropdownWidth - 8));
    let top = rect.bottom + 8;
    const estimatedHeight = 280;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = rect.top - estimatedHeight - 8;
    }
    setDropdownStyle({
      position: 'fixed',
      top,
      left,
      width: dropdownWidth,
      zIndex: 10050,
    });
  }, []);

  useEffect(() => {
    if (!profileDropdownOpen) return;
    updateDropdownPosition();
    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [profileDropdownOpen, updateDropdownPosition]);

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
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
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
    setProfileDropdownOpen((prev) => {
      if (!prev) {
        setTimeout(updateDropdownPosition, 0);
      }
      return !prev;
    });
  }, [updateDropdownPosition]);

  return (
    <>
      <SupportLabel />
      <HomeNavToolbarSeparator />
      <a href={SUPPORT_PHONE_TEL} className="home-nav-phone-number">
        {SUPPORT_PHONE_DISPLAY}
      </a>
      <HomeNavToolbarSeparator />
      <CallNavButton />
      <HomeNavToolbarSeparator variant="mobile" />
      <WhatsAppNavButton />
      <HomeNavToolbarSeparator variant="mobile" />
      <div className="home-nav-util-group" role="group" aria-label="Regional settings">
        <LanguageDropdown variant="minimal" className="home-nav-util-language" />
        <span className="home-nav-util-divider" aria-hidden="true">
          |
        </span>
        <CurrencyDropdown variant="minimal" className="home-nav-util-currency" />
      </div>
      {!hideContactUs ? (
        <>
          <HomeNavToolbarSeparator />
          <div className="home-nav-contact-wrap relative block">
            <a href="/contact" className="home-nav-contact-link">
              {t('contactUs')}
            </a>
          </div>
        </>
      ) : null}
      <HomeNavToolbarSeparator />
      <div className="home-top-nav-profile relative shrink-0" ref={profileRef}>
        <button
          type="button"
          className="home-top-nav-profile-btn relative block h-8 w-8 shrink-0 cursor-pointer rounded-full border-2 border-slate-300 bg-white p-0 shadow-sm no-underline transition-[box-shadow,border-color] duration-300 hover:border-[var(--cobrother-hover-color)] hover:bg-white hover:shadow-md focus:outline-none md:h-9 md:w-9"
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

        {profileDropdownOpen && dropdownStyle &&
          createPortal(
            <div
              ref={dropdownRef}
              className="fixed bg-white border border-gray-200 rounded-xl shadow-xl min-w-[10rem] overflow-hidden"
              style={dropdownStyle}
            >
            {user ? (
              <>
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <a
                  href="/dashboard"
                  className="menu-item-gradient block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline font-medium"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {t('dashboard')}
                </a>
                <a
                  href="/contact"
                  className="home-profile-mobile-only menu-item-gradient px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline font-medium"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {t('contactUs')}
                </a>
                <div className="home-profile-mobile-only px-3 py-1.5 text-sm font-medium">
                  <SupportLabel />
                </div>
                <a
                  href={SUPPORT_PHONE_TEL}
                  className="home-profile-mobile-only px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-gray-50 transition-colors no-underline"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {SUPPORT_PHONE_DISPLAY}
                </a>
                <button
                  type="button"
                  className="menu-item-gradient block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/complete-profile');
                  }}
                >
                  {t('updateProfile')}
                </button>
                <button
                  type="button"
                  className="menu-item-gradient block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/security/password');
                  }}
                >
                  Password & Security
                </button>
                <div className="border-t border-gray-100">
                  <button
                    type="button"
                    className="menu-item-gradient block w-full px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer border-0 bg-transparent"
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
              <div className="px-3 py-1.5 text-sm text-gray-400">…</div>
            ) : (
              <>
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={goToLogin}
                >
                  {t('signIn')}
                </button>
                {!hideContactUs ? (
                  <a
                    href="/contact"
                    className="home-profile-mobile-only px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors no-underline"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    {t('contactUs')}
                  </a>
                ) : null}
                <div className="home-profile-mobile-only px-3 py-1.5 text-sm font-medium">
                  <SupportLabel />
                </div>
                <a
                  href={SUPPORT_PHONE_TEL}
                  className="home-profile-mobile-only px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-gray-100 transition-colors no-underline"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  {SUPPORT_PHONE_DISPLAY}
                </a>
                <div className="home-profile-mobile-only home-profile-mobile-select-row px-3 py-1.5">
                  <span className="home-profile-mobile-select-label">Language</span>
                  <LanguageDropdown variant="minimal" className="home-profile-menu-language" />
                </div>
                <div className="home-profile-mobile-only home-profile-mobile-select-row px-3 py-1.5">
                  <span className="home-profile-mobile-select-label">Currency</span>
                  <CurrencyDropdown variant="minimal" className="home-profile-menu-currency" />
                </div>
              </>
            )}
          </div>,
          document.body
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
