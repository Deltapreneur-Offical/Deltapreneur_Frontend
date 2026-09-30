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
          className="cookie-consent-banner fixed inset-x-0 bottom-0 z-[10000] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="region"
          aria-label={t('cookieConsentBannerLabel')}
        >
          <div className="mx-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-850 bg-slate-900 p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.3)] sm:gap-4 sm:rounded-[24px] sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 sm:flex">
                <Cookie className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white sm:text-base">
                  {t('cookieConsentBannerTitle')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300 [overflow-wrap:anywhere] sm:text-sm">
                  {t('cookieConsentBannerBody')}{' '}
                  <Link
                    to="/privacy-policy#cookies"
                    className="font-semibold text-indigo-400 underline-offset-2 hover:underline"
                  >
                    {t('Privacy Policy')}
                  </Link>
                </p>
              </div>
            </div>

            {/*
              Buttons: phones stack (Accept full width, Reject/Manage side by side),
              tablets show one equal-width row, desktop keeps them on the right.
            */}
            <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:w-auto lg:flex-row lg:justify-end">
              <button
                type="button"
                onClick={acceptAll}
                className="col-span-2 order-first min-h-[44px] rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:order-last sm:col-span-1 sm:px-4 lg:min-h-0 lg:whitespace-nowrap"
              >
                {t('cookieConsentAcceptAll')}
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="min-h-[44px] rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 sm:order-first sm:px-4 lg:min-h-0 lg:whitespace-nowrap"
              >
                {t('cookieConsentReject')}
              </button>
              <button
                type="button"
                onClick={openPreferences}
                className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 sm:px-4 lg:min-h-0 lg:whitespace-nowrap"
              >
                {t('cookieConsentManage')}
              </button>
            </div>
          </div>
        </div>
      )}
      <CookiePreferencesModal />
    </>
  );
}
