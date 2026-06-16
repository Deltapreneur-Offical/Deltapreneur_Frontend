import ListingCardShell from '../listings/ListingCardShell';

/**
 * Homepage listing preview wrapper — thin animated gradient border (matches Virtual Assistant cards).
 */
export default function HomePreviewCardShell({ children, className = '' }) {
  return (
    <ListingCardShell className={`home-preview-card-shell${className ? ` ${className}` : ''}`}>
      <div className="home-preview-card-border h-full">
        <div className="home-preview-card-beam-spinner" aria-hidden="true" />
        <div className="home-preview-card-border__inner h-full">
          {children}
        </div>
      </div>
    </ListingCardShell>
  );
}
