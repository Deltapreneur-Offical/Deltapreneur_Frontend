/**
 * Shared marketplace card shell — fixed height + flat header (AI/domain search style).
 */
export const LISTING_CARD_HEIGHT = 'h-[355px] max-h-[355px]';

export const LISTING_CARD_HEADER_CLASS =
  'relative border-b border-gray-100 bg-white px-4 pt-3 pb-3 min-h-[88px] flex items-start flex-shrink-0';

export const listingCardBaseClass = (extra = '') =>
  `listing-card-glow card-glow-hover group relative bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-300 ${LISTING_CARD_HEIGHT} min-h-[355px] ${extra}`.trim();

export default function MarketplaceListingCardFrame({
  cardClassName = 'venture-listing-card',
  image,
  imageAlt = '',
  initial = '?',
  headerTitle = '',
  headerSubtitle = '',
  headerBadges = null,
  onClick,
  browseMode = false,
  children,
  footer,
}) {
  const interactive = Boolean(onClick);

  return (
    <div
      className={listingCardBaseClass(cardClassName)}
      onClick={interactive ? (e) => {
        if (!onClick) return;
        if (e?.target && e.target.closest && e.target.closest('button, a, input, textarea, select, label, [role="link"]')) return;
        onClick();
      } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (!onClick) return;
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); onClick(); }
      } : undefined}
    >
      <div className={LISTING_CARD_HEADER_CLASS}>
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="absolute top-0 right-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.1] transition-opacity duration-300"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className="listing-card-header__identity relative z-10 w-full min-w-0">
          {image ? (
            <img
              src={image}
              alt={imageAlt}
              className="listing-card-header__avatar object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="listing-card-header__avatar listing-card-header__avatar--fallback">
              {initial}
            </div>
          )}
          <div className="listing-card-header__text min-w-0 flex-1">
            {headerTitle ? (
              <h3 className="listing-card-header__title truncate" title={headerTitle}>
                {headerTitle}
              </h3>
            ) : null}
            {headerSubtitle ? (
              <p className="listing-card-header__subtitle truncate" title={headerSubtitle}>
                {headerSubtitle}
              </p>
            ) : null}
            {headerBadges ? (
              <div className="listing-card-header__badges">
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
    `inline-flex items-center justify-center leading-none min-h-[18px] px-2.5 py-[3px] text-[9px] font-extrabold rounded-full uppercase tracking-wide border whitespace-nowrap ${className}`.trim();
  if (variant === 'verified' || variant === 'live' || variant === 'available') {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>
        {children}
      </span>
    );
  }
  if (variant === 'premium' || variant === 'featured') {
    return (
      <span className={`${base} bg-[#F8F0DC] text-[#9A6B1D] border-[#E5D7B8]`}>
        {children}
      </span>
    );
  }
  if (variant === 'pending') {
    return (
      <span className={`${base} bg-slate-50 text-slate-600 border-slate-200`}>
        {children}
      </span>
    );
  }
  if (variant === 'rejected') {
    return (
      <span className={`${base} bg-red-50 text-red-700 border-red-200`}>
        {children}
      </span>
    );
  }
  if (variant === 'owner') {
    return (
      <span className={`${base} bg-slate-50 text-slate-800 border-slate-200`}>
        {children}
      </span>
    );
  }
  return (
    <span className={`${base} bg-sky-50 text-sky-700 border-sky-200`}>
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
