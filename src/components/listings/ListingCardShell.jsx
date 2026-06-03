/**
 * Wrap any listing card for the shared outer border glow on hover.
 * Use with `listing-card-glow card-glow-hover` on the inner card element.
 */
export default function ListingCardShell({ children, className = '' }) {
  return (
    <div className={`listing-card-glow-shell h-full flex flex-col${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
