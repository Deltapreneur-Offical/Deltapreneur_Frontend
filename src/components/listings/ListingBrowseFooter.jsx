/** Homepage / browse-only footer: stats + single CTA (no buy/edit/delete). */
export default function ListingBrowseFooter({
  children,
  onViewDetails,
  label = 'View Details',
  className = '',
}) {
  return (
    <div className={`listing-browse-footer ${className}`.trim()}>
      {children ? <div className="listing-browse-footer__meta">{children}</div> : null}
      <button
        type="button"
        className="listing-browse-footer__cta btn-glow btn-glow-sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onViewDetails?.();
        }}
      >
        {label}
      </button>
    </div>
  );
}
