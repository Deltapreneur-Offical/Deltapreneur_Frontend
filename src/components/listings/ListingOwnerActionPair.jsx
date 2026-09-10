/**
 * Equal-width owner actions: Edit | Start Auction.
 * Stays two columns from mobile through desktop.
 */
export const OWNER_ACTION_BTN =
  'inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-[12px] font-semibold tracking-tight whitespace-nowrap transition-colors duration-150 sm:text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60';

export const OWNER_ACTION_BTN_EDIT =
  `${OWNER_ACTION_BTN} border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300`;

export const OWNER_ACTION_BTN_AUCTION =
  `${OWNER_ACTION_BTN} border border-orange-700/10 bg-[#c2410c] text-white shadow-sm hover:bg-[#9a3412] focus-visible:ring-orange-300`;

export const OWNER_ACTION_BTN_AUCTION_SOFT =
  `${OWNER_ACTION_BTN} border border-orange-200 bg-orange-50 text-[#c2410c] shadow-sm hover:bg-orange-100 focus-visible:ring-orange-200`;

export const OWNER_ACTION_BTN_MUTED =
  `${OWNER_ACTION_BTN} cursor-default border border-slate-200 bg-slate-50 text-slate-500`;

export default function ListingOwnerActionPair({ left, right, className = '' }) {
  const cols = left && right ? 'grid-cols-2' : 'grid-cols-1';
  return (
    <div className={`grid w-full min-w-0 ${cols} gap-2 ${className}`.trim()}>
      {left ? <div className="min-w-0">{left}</div> : null}
      {right ? <div className="min-w-0">{right}</div> : null}
    </div>
  );
}
