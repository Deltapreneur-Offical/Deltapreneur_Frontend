import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Globe, CircleDollarSign, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_LABELS } from '../../constants/currencies';

const LANGUAGES = [
  { code: 'en-IN', name: 'English (IND)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'ur', name: 'Urdu' },
  { code: 'zh', name: '中文' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
  { code: 'de', name: 'Deutsch' },
];

const LANG_SHORT = {
  'en-IN': 'EN',
  en: 'EN',
  hi: 'HI',
  'en-US': 'US',
  'en-GB': 'UK',
  ur: 'UR',
  zh: 'ZH',
  fr: 'FR',
  pt: 'PT',
  de: 'DE',
};

const CURRENCY_SHORT = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
};

function normalizeLangCode(code) {
  return code === 'en' ? 'en-IN' : code;
}

function languageShortCode(i18nLanguage) {
  const normalized = normalizeLangCode(i18nLanguage);
  if (LANG_SHORT[normalized]) return LANG_SHORT[normalized];
  const base = (normalized || '').split('-')[0];
  return LANG_SHORT[base] || 'EN';
}

function isActiveLanguage(current, code) {
  return normalizeLangCode(current) === normalizeLangCode(code);
}

function AccordionRow({ id, expanded, onToggle, icon: Icon, label, summary, children }) {
  const isOpen = expanded === id;
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Icon size={16} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">{label}</span>
          <span className="block text-xs text-gray-500">{summary}</span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen ? <div className="border-t border-gray-50 bg-slate-50/80 px-2 pb-2 pt-1">{children}</div> : null}
    </div>
  );
}

function OptionButton({ active, onClick, primary, secondary }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors border-none cursor-pointer ${
        active ? 'bg-indigo-100 font-semibold text-indigo-800' : 'bg-white text-gray-700 hover:bg-white/90'
      }`}
      onClick={onClick}
    >
      <span className="font-medium tabular-nums">{primary}</span>
      {secondary ? <span className="truncate text-gray-500">{secondary}</span> : null}
    </button>
  );
}

export default function AppProfileRegionalMenu({ displayName, email }) {
  const { t, i18n } = useTranslation();
  const { changeLanguage } = useLanguage();
  const { currency, setCurrency, supportedCurrencies } = useCurrency();
  const [expanded, setExpanded] = useState(null);

  const toggle = (section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <div className="app-profile-regional-menu">
      {(displayName || email) && (
        <div className="border-b border-gray-100 px-4 py-3">
          {displayName ? (
            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
          ) : null}
          {email ? <p className="truncate text-xs text-gray-500">{email}</p> : null}
        </div>
      )}

      <Link
        to="/settings/payouts"
        className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
        role="menuitem"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CreditCard size={16} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">{t('payoutSettingsNavTitle')}</span>
          <span className="block text-xs text-gray-500">{t('payoutSettingsNavSubtitle')}</span>
        </span>
      </Link>

      <AccordionRow
        id="language"
        expanded={expanded}
        onToggle={toggle}
        icon={Globe}
        label={t('language', { defaultValue: 'Language' })}
        summary={languageShortCode(i18n.language)}
      >
        <div className="max-h-48 space-y-0.5 overflow-y-auto" role="listbox" aria-label={t('language')}>
          {LANGUAGES.map((lang) => (
            <OptionButton
              key={lang.code}
              active={isActiveLanguage(i18n.language, lang.code)}
              primary={languageShortCode(lang.code)}
              secondary={lang.name}
              onClick={() => changeLanguage(lang.code)}
            />
          ))}
        </div>
      </AccordionRow>

      <AccordionRow
        id="currency"
        expanded={expanded}
        onToggle={toggle}
        icon={CircleDollarSign}
        label={t('currency', { defaultValue: 'Currency' })}
        summary={`${CURRENCY_SHORT[currency] || ''} ${currency}`.trim()}
      >
        <div className="max-h-48 space-y-0.5 overflow-y-auto" role="listbox" aria-label="Currency">
          {supportedCurrencies.map((code) => (
            <OptionButton
              key={code}
              active={currency === code}
              primary={`${CURRENCY_SHORT[code] || ''} ${code}`.trim()}
              secondary={CURRENCY_LABELS[code] || code}
              onClick={() => setCurrency(code)}
            />
          ))}
        </div>
      </AccordionRow>
    </div>
  );
}
