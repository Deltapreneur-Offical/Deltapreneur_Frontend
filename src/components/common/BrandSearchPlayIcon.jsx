import '../../styles/brand-search-play-icon.css';

/**
 * Vector copy of assets/pricesectionV.png (253×294) for the hero search submit.
 * Uses currentColor so the fill can follow --home-hero-sync-color-bright.
 */
export const BRAND_SEARCH_PLAY_VIEWBOX_WIDTH = 253;
export const BRAND_SEARCH_PLAY_VIEWBOX_HEIGHT = 294;

const PLAY_PATH =
  'M7 8 Q7 3 13 5 L231 134 Q252 147 231 160 L13 289 Q7 291 7 286 Z';

export default function BrandSearchPlayIcon({ className = '' }) {
  return (
    <svg
      className={['brand-search-play-icon', className].filter(Boolean).join(' ')}
      viewBox={`0 0 ${BRAND_SEARCH_PLAY_VIEWBOX_WIDTH} ${BRAND_SEARCH_PLAY_VIEWBOX_HEIGHT}`}
      width={53}
      height={62}
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
    >
      <path d={PLAY_PATH} fill="currentColor" />
    </svg>
  );
}
