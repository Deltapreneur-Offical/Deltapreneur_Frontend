import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cookie, Shield, BarChart3, Megaphone, X } from 'lucide-react';
import { useCookieConsent } from '../../context/CookieConsentContext';

export default function CookiePreferencesModal() {
  const { t } = useTranslation();
  const { preferences, preferencesOpen, savePreferences, closePreferences } = useCookieConsent();

  const [draft, setDraft] = useState({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    if (preferencesOpen) {
      setDraft({
        analytics: Boolean(preferences?.analytics),
        marketing: Boolean(preferences?.marketing),
      });
    }
  }, [preferencesOpen, preferences]);

  if (!preferencesOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-preferences-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label={t('cookieConsentClose')}
        onClick={closePreferences}
      />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Cookie className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="cookie-preferences-title" className="text-lg font-bold text-slate-900">
                {t('cookieConsentManageTitle')}
              </h2>
              <p className="text-sm text-slate-600">{t('cookieConsentManageSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePreferences}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={t('cookieConsentClose')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <PreferenceRow
            icon={Shield}
            title={t('cookieConsentEssentialTitle')}
            description={t('cookieConsentEssentialDesc')}
            locked
            enabled
          />

          <PreferenceRow
            icon={BarChart3}
            title={t('cookieConsentAnalyticsTitle')}
            description={t('cookieConsentAnalyticsDesc')}
            enabled={draft.analytics}
            onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
          />

          <PreferenceRow
            icon={Megaphone}
            title={t('cookieConsentMarketingTitle')}
            description={t('cookieConsentMarketingDesc')}
            enabled={draft.marketing}
            onChange={(v) => setDraft((d) => ({ ...d, marketing: v }))}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={closePreferences}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('cookieConsentClose')}
          </button>
          <button
            type="button"
            onClick={() => savePreferences(draft)}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            {t('cookieConsentSavePreferences')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreferenceRow({ icon: Icon, title, description, enabled, onChange, locked = false }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
          </div>
        </div>
        {locked ? (
          <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {t('cookieConsentAlwaysOn')}
          </span>
        ) : (
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </label>
        )}
      </div>
    </div>
  );
}
