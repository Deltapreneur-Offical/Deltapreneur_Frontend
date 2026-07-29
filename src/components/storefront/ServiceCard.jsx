import { useState } from 'react';

const priceStyles = {
  available: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  unavailable: 'text-gray-500 bg-gray-50 border-gray-200',
};

import NoDomainsOverlay from './NoDomainsOverlay';

export default function ServiceCard({ icon, name, description, price, priceAvailable = true, onConfigure, isActive, noDomainsOverlay = false, children }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border bg-gradient-to-br from-amber-50/40 via-white to-white p-5 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_8px_28px_rgba(180,83,9,0.1),0_0_24px_rgba(251,191,36,0.12)] ring-1 transition-all duration-200 ${
        isActive
          ? 'border-amber-300 ring-4 ring-amber-200/70'
          : 'border-amber-200 ring-amber-100 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_10px_28px_rgba(251,191,36,0.18)] hover:ring-amber-200/70'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-600'} transition-colors`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-1">
        <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded border ${priceAvailable ? priceStyles.available : priceStyles.unavailable}`}>
          {priceAvailable ? `From ${price}` : 'Price on request'}
        </span>
        <button
          type="button"
          onClick={onConfigure}
          className={`inline-flex h-9 items-center justify-center gap-1.5 text-xs font-bold px-4 rounded-xl transition-all select-none ${
            isActive
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
          }`}
        >
          {isActive ? 'Hide Panel' : 'Configure'}
        </button>
      </div>

      {isActive && children && (
        <div className="relative mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
          {noDomainsOverlay ? (
            <>
              <div className="pointer-events-none select-none blur-[3px] opacity-55" aria-hidden="true">
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
