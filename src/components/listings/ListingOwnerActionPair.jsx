/**
 * Owner actions: compact pencil | full Put Auction label.
 */
export const OWNER_ACTION_BTN =
  'inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold tracking-tight whitespace-nowrap transition-colors duration-150 sm:text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60';

export const OWNER_ACTION_BTN_EDIT =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-300';

export const OWNER_ACTION_BTN_AUCTION =
  `${OWNER_ACTION_BTN} w-full border border-orange-700/10 bg-[#c2410c] text-white shadow-sm hover:bg-[#9a3412] focus-visible:ring-orange-300`;

export const OWNER_ACTION_BTN_AUCTION_SOFT =
  `${OWNER_ACTION_BTN} w-full border border-orange-200 bg-orange-50 text-[#c2410c] shadow-sm hover:bg-orange-100 focus-visible:ring-orange-200`;

export const OWNER_ACTION_BTN_MUTED =
  `${OWNER_ACTION_BTN} w-full cursor-default border border-slate-200 bg-slate-50 text-slate-500`;

export default function ListingOwnerActionPair({ left, right, className = '' }) {
  return (
    <div className={`flex w-full min-w-0 items-stretch gap-2 ${className}`.trim()}>
      {left ? <div className="shrink-0">{left}</div> : null}
      {right ? <div className="min-w-0 flex-1">{right}</div> : null}
    </div>
  );
}
