import ListingCardShell from '../listings/ListingCardShell';

/**
 * Homepage listing preview wrapper — slight hero-glow border (no shadow).
 *
 * The hover lift is driven purely by CSS (.home-preview-card-border:hover),
 * so it runs on the compositor and never fights the marquee's translateX
 * animation on the scrolling track.
 * @param {'domain'|'venture'|'coventure'|'technology'|'community'|'auction'|'operations'|'assistance'|'essentials'} accent
 * @param {boolean} [borderless] — hide the outer border (default + hover); keep lift hover
 */
export default function HomePreviewCardShell({
  children,
  className = '',
  accent = 'domain',
  borderless = false,
}) {
  const accentClass = accent ? ` home-preview-card-border--${accent}` : '';
  const borderlessClass = borderless ? ' home-preview-card-border--borderless' : '';

  return (
    <ListingCardShell className={`home-preview-card-shell${className ? ` ${className}` : ''}`}>
      <div
        className={`home-preview-card-border w-full${accentClass}${borderlessClass}`}
      >
        <div className="home-feature-card-beam-spinner" aria-hidden="true" />

        <div className="home-preview-card-border__inner w-full">
          {children}
        </div>
      </div>
    </ListingCardShell>
  );
}
