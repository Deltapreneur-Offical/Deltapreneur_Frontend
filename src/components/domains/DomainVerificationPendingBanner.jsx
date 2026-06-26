import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

export function PendingVerificationDot({ className = '', title }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full bg-orange-500 animate-pulse ${className}`}
      title={title}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export default function DomainVerificationPendingBanner({
  count = 1,
  onVerifyClick,
  showAction = true,
}) {
  const { t } = useTranslation();
  const plural = count !== 1;

  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200/90 bg-amber-50/60 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
      role="status"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <PendingVerificationDot />
          <p className="m-0 text-sm font-semibold text-amber-900">
            {t('domainsVerifyPendingTitle', {
              defaultValue: 'Listed successfully',
            })}
          </p>
        </div>
        <p className="m-0 text-sm leading-relaxed text-amber-900/90">
          {plural
            ? t('domainsVerifyPendingBodyPlural', {
                count,
                defaultValue:
                  'You have {{count}} domains live in the marketplace. Complete verification to earn the Verified badge and improve trust, discoverability, and buyer interest.',
              })
            : t('domainsVerifyPendingBody', {
                defaultValue:
                  'Your domain has been listed successfully and is now live in the marketplace. Complete the domain verification process to earn the Verified badge and boost trust, visibility, and buyer confidence.',
              })}
        </p>
        <ol className="m-0 mt-2 list-decimal space-y-0.5 pl-4 text-[0.7rem] leading-relaxed text-amber-800/80 sm:text-xs">
          <li>
            {t('domainsVerifyStepDashboard', {
              defaultValue: 'Open Domains Dashboard → My Listings',
            })}
          </li>
          <li>
            {t('domainsVerifyStepVerify', {
              defaultValue: 'Select Verify and complete DNS TXT, HTML meta/file, or WHOIS email verification to unlock the Verified badge',
            })}
          </li>
          <li>
            {t('domainsVerifyStepPublish', {
              defaultValue: 'Verified domains stand out more in the marketplace and can attract stronger buyer attention',
            })}
          </li>
        </ol>
      </div>
      {showAction && onVerifyClick ? (
        <button
          type="button"
          className="btn-glow btn-glow-sm shrink-0 self-start"
          onClick={onVerifyClick}
        >
          <ShieldCheck size={14} />
          {t('domainsVerifyPendingAction', { defaultValue: 'Verify now' })}
        </button>
      ) : null}
    </div>
  );
}
