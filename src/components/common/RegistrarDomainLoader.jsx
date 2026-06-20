import { useTranslation } from 'react-i18next';

const OTHER_TLDS = Array.from({ length: 6 }, (_, index) => index);

function SkeletonBone({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`.trim()} aria-hidden="true" />;
}

export default function RegistrarDomainLoader() {
  const { t } = useTranslation();

  return (
    <div
      className="mb-8 rounded-2xl border border-[rgba(var(--cobrother-brand-green-rgb),0.18)] bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5"
      role="status"
      aria-live="polite"
      aria-label={t('searchCheckingDomains')}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-slate-950">{t('searchCheckingDomains')}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{t('searchCheckingDomainsHint')}</p>
        </div>
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgba(var(--cobrother-brand-green-rgb),0.35)] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--cobrother-brand-green)]" />
        </span>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="registrar-domain-loader-bar h-full w-1/3 rounded-full bg-[var(--cobrother-brand-green)]" />
      </div>

      <div className="domain-search-card domain-search-card--featured mb-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        <SkeletonBone className="mb-4 h-6 w-28 rounded-full" />
        <SkeletonBone className="mb-4 h-10 w-2/3 max-w-sm" />
        <SkeletonBone className="mb-6 h-8 w-32" />
        <SkeletonBone className="h-12 w-40 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {OTHER_TLDS.map((item) => (
          <div
            key={item}
            className="domain-search-card rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
          >
            <SkeletonBone className="mb-3 h-5 w-24 rounded-full" />
            <SkeletonBone className="mb-4 h-7 w-40" />
            <SkeletonBone className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
