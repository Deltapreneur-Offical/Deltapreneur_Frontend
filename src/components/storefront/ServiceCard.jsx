import { useState } from 'react';

const priceStyles = {
  available: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  unavailable: 'text-gray-500 bg-gray-50 border-gray-200',
};

import NoDomainsOverlay from './NoDomainsOverlay';

/** API labels often already include "From …" — avoid "From From …". */
function formatServicePriceLabel(price) {
  const raw = String(price ?? '').trim();
  if (!raw || raw === '—') return 'Price on request';
  if (/^from\b/i.test(raw)) return raw;
  return `From ${raw}`;
}

export default function ServiceCard({ icon, name, description, price, priceAvailable = true, onConfigure, isActive, noDomainsOverlay = false, children }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-3xl border bg-white p-5 shadow-[0_8px_24px_rgba(56,189,248,0.15)] transition-all duration-200 ${
        isActive
          ? 'border-[#BAE6FD] ring-2 ring-[#BAE6FD]'
          : 'border-[#BAE6FD] hover:-translate-y-0.5 hover:border-[#38BDF8] hover:shadow-[0_12px_28px_rgba(56,189,248,0.22)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] transition-colors shrink-0 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#1E293B]">{name}</h3>
          <p className="text-xs text-[#64748B] leading-relaxed mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-1 pt-2.5 border-t border-[#E2E8F0]">
        <span
          className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-full border ${
            priceAvailable
              ? 'bg-[#EFF6FF] text-[#2563EB] border-[#93C5FD]'
              : 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
          }`}
        >
          {priceAvailable ? formatServicePriceLabel(price) : 'Needs an Active Domain'}
        </span>
        <button
          type="button"
          onClick={onConfigure}
          className={`inline-flex h-9 items-center justify-center gap-1.5 text-xs font-bold px-4 rounded-xl transition-all select-none ${
            isActive
              ? 'bg-gray-800 text-white hover:bg-black shadow-sm'
              : 'bg-black text-white hover:bg-gray-800 shadow-sm'
          }`}
        >
          {isActive ? 'Hide Panel' : 'Configure'}
        </button>
      </div>

      {isActive && children && (
        <div className="relative mt-3 pt-3 border-t border-[#E2E8F0] animate-in fade-in slide-in-from-top-2 duration-200">
          {noDomainsOverlay ? (
            <>
              <div className="pointer-events-none select-none blur-[1px] opacity-70" aria-hidden="true">
                {children}
              </div>
              <NoDomainsOverlay />
            </>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
