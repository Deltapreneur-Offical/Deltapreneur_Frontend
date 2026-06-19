import ListingCardShell from '../listings/ListingCardShell';

/**
 * Homepage listing preview wrapper — slight hero-glow border (no shadow).
 * @param {'domain'|'venture'|'coventure'|'technology'|'community'|'auction'} accent
 */
export default function HomePreviewCardShell({ children, className = '', accent = 'domain' }) {
  const accentClass = accent ? ` home-preview-card-border--${accent}` : '';

  return (
    <ListingCardShell className={`home-preview-card-shell${className ? ` ${className}` : ''}`}>
      <div className={`home-preview-card-border w-full${accentClass}`}>
        <div className="home-preview-card-border__inner w-full">
          {children}
        </div>
      </div>
    </ListingCardShell>
  );
}
