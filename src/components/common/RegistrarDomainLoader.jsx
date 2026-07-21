import { useTranslation } from 'react-i18next';
import { DomainCardSkeleton } from './DomainExtensionsLoader';

/**
 * Initial search skeleton shown only until the primary (.com) result is ready.
 * Extension skeletons live below the real primary card via DomainExtensionsLoader.
 */
export default function RegistrarDomainLoader() {
  const { t } = useTranslation();

  return (
    <div
      className="mb-6 rounded-2xl border border-[rgba(var(--cobrother-brand-green-rgb),0.18)] bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5"
      role="status"
      aria-live="polite"
      aria-label={t('searchCheckingDomains')}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-slate-950">{t('searchCheckingDomains')}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{t('searchCheckingDomainsHint')}</p>
        </div>
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgba(var(--cobrother-brand-green-rgb),0.35)] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--cobrother-brand-green)]" />
        </span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full w-[8%] rounded-full bg-[var(--cobrother-brand-green)] transition-all duration-300"
          style={{ width: '8%' }}
        />
      </div>

      <DomainCardSkeleton featured />
    </div>
  );
}
