/**
 * Shared marketplace card shell — fixed height + flat header (AI/domain search style).
 */
export const LISTING_CARD_HEIGHT = 'h-[355px] max-h-[355px]';

export const LISTING_CARD_HEADER_CLASS =
  'relative border-b border-gray-100 bg-white px-4 pt-3.5 pb-3.5 min-h-[90px] max-h-[90px] flex items-end flex-shrink-0';

export const listingCardBaseClass = (extra = '') =>
  `listing-card-glow card-glow-hover group relative bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-300 ${LISTING_CARD_HEIGHT} min-h-[355px] ${extra}`.trim();

export default function MarketplaceListingCardFrame({
  cardClassName = 'venture-listing-card',
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
      <div className={LISTING_CARD_HEADER_CLASS}>
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="absolute top-0 right-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.1] transition-opacity duration-300"
          />
        ) : null}
        <div className="relative z-10 flex items-end justify-between w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {image ? (
              <img
                src={image}
                alt={imageAlt}
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-gray-100 shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-2xl font-extrabold text-gray-900 ring-2 ring-gray-100 shadow-sm bg-gray-100 flex-shrink-0">
                {initial}
              </div>
            )}
            {headerBadges ? (
              <div className="flex flex-wrap items-start content-start gap-x-1 gap-y-0.5 min-w-0 max-w-[9.5rem] sm:max-w-[10.5rem] self-end pb-0.5">
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

export function ListingCardBadge({ children, variant = 'glass', className = '' }) {
  const base =
    `inline-flex items-center justify-center leading-none min-h-[18px] px-2 py-[3px] text-[9px] font-extrabold rounded uppercase tracking-wide shadow-sm whitespace-nowrap ${className}`.trim();
  if (variant === 'verified') {
    return (
      <span className={`${base} bg-emerald-600 text-white`}>
        {children}
      </span>
    );
  }
  if (variant === 'admin') {
    return (
      <span className={`${base} bg-amber-100 text-amber-800`}>
        {children}
      </span>
    );
  }
  if (variant === 'pending') {
    return (
      <span className={`${base} bg-gray-100 text-gray-600`}>
        {children}
      </span>
    );
  }
  if (variant === 'review') {
    return (
      <span className={`${base} bg-sky-100 text-sky-800`}>
        {children}
      </span>
    );
  }
  if (variant === 'rejected') {
    return (
      <span className={`${base} bg-red-100 text-red-700`}>
        {children}
      </span>
    );
  }
  if (variant === 'review') {
    return (
      <span className={`${base} bg-sky-100 text-sky-800`}>
        {children}
      </span>
    );
  }
  if (variant === 'rejected') {
    return (
      <span className={`${base} bg-red-100 text-red-700`}>
        {children}
      </span>
    );
  }
  if (variant === 'owner') {
    return (
      <span className={`${base} bg-gray-100 text-gray-800`}>
        {children}
      </span>
    );
  }
  if (variant === 'auction') {
    return (
      <span className={`${base} bg-gray-900 text-white font-bold`}>
        {children}
      </span>
    );
  }
  return (
    <span className={`${base} bg-gray-100 text-gray-700 font-bold`}>
      {children}
    </span>
  );
}

export function ListingPriceBox({ amount, caption, variant = 'deal' }) {
  return (
    <div className="rounded-lg px-2 md:px-3 py-1.5 md:py-2 mb-2 md:mb-3 flex-shrink-0 bg-gray-50 border border-gray-200">
      <div className="flex items-baseline gap-1 min-w-0">
        <span className="text-lg md:text-xl font-extrabold tracking-tight truncate text-gray-900">
          {amount}
        </span>
        <span className="text-[9px] md:text-[10px] font-semibold whitespace-nowrap text-gray-500">
          {caption}
        </span>
      </div>
    </div>
  );
}
