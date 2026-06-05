/**
 * Shared marketplace card shell — fixed height + gradient header (home venture style).
 */
export const LISTING_CARD_HEIGHT = 'h-[355px] max-h-[355px]';

export const listingCardBaseClass = (extra = '') =>
  `listing-card-glow card-glow-hover group relative bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200 shadow-sm transition-all duration-300 ${LISTING_CARD_HEIGHT} min-h-[355px] ${extra}`.trim();

export default function MarketplaceListingCardFrame({
  cardClassName = 'venture-listing-card',
  gradient = 'from-indigo-600 via-blue-500 to-cyan-400',
  image,
  imageAlt = '',
  initial = '?',
  headerBadges = null,
  onClick,
  browseMode = false,
  children,
  footer,
}) {
  const interactive = !browseMode && onClick;

  return (
    <div
      className={listingCardBaseClass(cardClassName)}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter') onClick?.(); } : undefined}
    >
      <div className={`relative bg-gradient-to-r ${gradient} px-4 pt-3.5 pb-3.5 min-h-[90px] max-h-[90px] flex items-end flex-shrink-0`}>
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="absolute top-0 right-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-300"
          />
        ) : null}
        <div className="relative z-10 flex items-end justify-between w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {image ? (
              <img
                src={image}
                alt={imageAlt}
                className="w-14 h-14 rounded-xl object-cover ring-[3px] ring-white/50 shadow-lg flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-2xl font-extrabold text-white ring-[3px] ring-white/30 shadow-lg bg-white/15 backdrop-blur-sm flex-shrink-0">
                {initial}
              </div>
            )}
            {headerBadges ? (
              <div className="flex flex-wrap items-center gap-1 min-w-0 max-h-[52px] overflow-hidden">
                {headerBadges}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-4 pt-3 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </div>
        {footer ? (
          <div className="flex-shrink-0 mt-auto pt-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ListingCardBadge({ children, variant = 'glass' }) {
  if (variant === 'verified') {
    return (
      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-extrabold rounded uppercase tracking-wide shadow-sm whitespace-nowrap">
        {children}
      </span>
    );
  }
  if (variant === 'pending') {
    return (
      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded uppercase tracking-wide shadow-sm whitespace-nowrap">
        {children}
      </span>
    );
  }
  if (variant === 'owner') {
    return (
      <span className="px-1.5 py-0.5 bg-white text-indigo-600 text-[9px] font-extrabold rounded uppercase tracking-wide shadow-sm whitespace-nowrap">
        {children}
      </span>
    );
  }
  if (variant === 'auction') {
    return (
      <span className="px-1.5 py-0.5 bg-yellow-400 text-gray-900 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
        {children}
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 bg-white/25 backdrop-blur-sm text-white text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
      {children}
    </span>
  );
}

export function ListingPriceBox({ amount, caption, variant = 'deal' }) {
  const isAuction = variant === 'auction';
  return (
    <div
      className={`rounded-lg px-2 md:px-3 py-1.5 md:py-2 mb-2 md:mb-3 flex-shrink-0 ${
        isAuction
          ? 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100'
          : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100'
      }`}
    >
      <div className="flex items-baseline gap-1 min-w-0">
        <span
          className={`text-lg md:text-xl font-extrabold tracking-tight truncate ${
            isAuction ? 'text-purple-700' : 'text-emerald-700'
          }`}
        >
          {amount}
        </span>
        <span
          className={`text-[9px] md:text-[10px] font-semibold whitespace-nowrap ${
            isAuction ? 'text-purple-400' : 'text-emerald-400'
          }`}
        >
          {caption}
        </span>
      </div>
    </div>
  );
}
