import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Globe, CircleDollarSign, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_LABELS } from '../../constants/currencies';
import { getCurrencySymbol, getCurrencyFlag } from '../../utils/currencyDisplay';

const LANGUAGES = [
  { code: 'en-IN', name: 'English' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'ur', name: 'Urdu' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'hi', name: 'Hindi' },
];

const LANG_SHORT = {
  'en-IN': 'EN',
  en: 'EN',
  hi: 'HI',
  es: 'ES',
  ar: 'AR',
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
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-50"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Icon size={14} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">{label}</span>
          <span className="block text-xs text-gray-500">{summary}</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen ? <div className="border-t border-gray-50 bg-slate-50/80 px-2 pb-1.5 pt-1">{children}</div> : null}
    </div>
  );
}

function OptionButton({ active, onClick, primary, secondary }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors border-none cursor-pointer ${
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

  const [currencySearch, setCurrencySearch] = useState('');

  const toggle = (section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  const filteredCurrencies = supportedCurrencies.filter((code) => {
    const search = currencySearch.toLowerCase().trim();
    if (!search) return true;
    const label = (CURRENCY_LABELS[code] || '').toLowerCase();
    return code.toLowerCase().includes(search) || label.includes(search);
  });

  return (
    <div className="app-profile-regional-menu">
      {(displayName || email) && (
        <div className="border-b border-gray-100 px-3 py-2">
          {displayName ? (
            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
          ) : null}
          {email ? <p className="truncate text-xs text-gray-500">{email}</p> : null}
        </div>
      )}

      <Link
        to="/settings/payouts"
        className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-left transition-colors hover:bg-gray-50"
        role="menuitem"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CreditCard size={14} strokeWidth={2} />
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
        summary={`${getCurrencySymbol(currency)} ${currency}`}
      >
        <div className="px-2 py-1 bg-white rounded-lg border border-gray-100 mb-1.5">
          <input
            type="text"
            placeholder="Search currency..."
            value={currencySearch}
            onChange={(e) => setCurrencySearch(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          />
        </div>
        <div className="max-h-60 space-y-1 overflow-y-auto pr-1" role="listbox" aria-label="Currency">
          {filteredCurrencies.map((code) => {
            const flag = getCurrencyFlag(code);
            const symbol = getCurrencySymbol(code);
            const label = CURRENCY_LABELS[code] || code;
            const cleanLabel = label.includes(symbol) ? label.replace(symbol, '').trim() : label;
            return (
              <button
                key={code}
                type="button"
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors border-none cursor-pointer ${
                  currency === code ? 'bg-indigo-50 font-semibold text-indigo-800' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setCurrency(code)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img src={flag} alt="" className="w-4 h-3 object-cover rounded-[3px] shrink-0 border border-gray-200/60 shadow-sm" />
                  <div className="min-w-0">
                    <span className="block font-medium text-gray-900 leading-tight">{code}</span>
                    <span className="block text-[10px] text-gray-400 truncate leading-tight mt-0.5">{cleanLabel}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-500 shrink-0">{symbol}</span>
              </button>
            );
          })}
        </div>
      </AccordionRow>
    </div>
  );
}
