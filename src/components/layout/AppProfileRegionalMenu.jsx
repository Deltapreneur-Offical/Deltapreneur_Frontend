import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AppProfileRegionalMenu({ displayName, email }) {
  const { t } = useTranslation();

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
    </div>
  );
}
