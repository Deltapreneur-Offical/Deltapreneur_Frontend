import { Lock } from 'lucide-react';

export default function NoDomainsOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/25 backdrop-blur-[1.5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="storefront-no-domains-title"
    >
      <div className="flex flex-col items-center px-6 py-8 text-center max-w-[18rem]">
        <div className="mb-4 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border border-gray-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <Lock className="h-7 w-7 text-gray-900" strokeWidth={1.75} />
        </div>
        <h3 id="storefront-no-domains-title" className="text-[1.05rem] font-bold text-gray-900">
          No Domains Found
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          You don&apos;t have any domains yet. Buy or connect a domain to configure this service.
        </p>
      </div>
    </div>
  );
}
