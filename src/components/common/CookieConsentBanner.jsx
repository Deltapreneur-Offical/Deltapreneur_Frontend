import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '../../context/CookieConsentContext';
import CookiePreferencesModal from './CookiePreferencesModal';

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const {
    bannerVisible,
    acceptAll,
    rejectNonEssential,
    openPreferences,
  } = useCookieConsent();

  return (
    <>
      {bannerVisible && (
        <div
          className="fixed inset-x-0 bottom-0 z-[10000] p-3 sm:p-4"
          role="region"
          aria-label={t('cookieConsentBannerLabel')}
        >
          <div className="mx-auto flex max-w-5xl flex-row items-center justify-between gap-4 rounded-[24px] border border-slate-850 bg-slate-900 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.3)] sm:gap-6 sm:p-5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 sm:flex">
                <Cookie className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white sm:text-base">
                  {t('cookieConsentBannerTitle')}
                </p>
                <p className="hidden mt-1 text-xs leading-relaxed text-slate-300 sm:block sm:text-sm">
                  {t('cookieConsentBannerBody')}{' '}
                  <Link
                    to="/privacy-policy#cookies"
                    className="font-semibold text-indigo-400 underline-offset-2 hover:underline"
                  >
                    {t('Privacy Policy')}
                  </Link>
                </p>
                <p className="block mt-0.5 text-[10px] leading-relaxed text-slate-400 sm:hidden">
                  We use cookies to enhance your experience. Manage your preferences anytime.
                </p>
              </div>
            </div>

            {/* Desktop Buttons */}
            <div className="hidden shrink-0 flex-row gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-350 transition hover:bg-slate-800 hover:text-white"
              >
                {t('cookieConsentReject')}
              </button>
              <button
                type="button"
                onClick={openPreferences}
                className="rounded-lg border border-slate-800 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                {t('cookieConsentManage')}
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                {t('cookieConsentAcceptAll')}
              </button>
            </div>

            {/* Mobile OK Button */}
            <div className="flex shrink-0 sm:hidden">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full border border-slate-700 bg-slate-800 px-7 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <CookiePreferencesModal />
    </>
  );
}
