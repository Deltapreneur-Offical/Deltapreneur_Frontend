import HomePreviewCardSkeleton from './HomePreviewCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeCardsNavRow from './HomeCardsNavRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';

const SKELETON_COUNT = 4;

export default function HomeSectionCardSkeleton({
  title,
  to,
  accent,
  variant = 'browse',
  compact = false,
  hideHeader = false,
  animated = false,
  reserveOnly = false,
}) {
  if (reserveOnly) {
    return (
      <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
        <div className="w-full">
          {!hideHeader && title ? (
            <HomeSectionHeader title={title} to={to} accent={accent} showViewAll={Boolean(to)} />
          ) : null}
          <div
            className="w-full"
            style={{ minHeight: 'var(--home-preview-card-height, 355px)' }}
            aria-hidden="true"
          />
        </div>
      </section>
    );
  }

  const cards = Array.from({ length: SKELETON_COUNT }).map((_, i) => (
    <HomePreviewRowItem key={i}>
      <HomePreviewCardSkeleton variant={variant} compact={compact} animated={animated} />
    </HomePreviewRowItem>
  ));

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full">
        {!hideHeader && title ? (
          <HomeSectionHeader title={title} to={to} accent={accent} showViewAll={Boolean(to)} />
        ) : null}
        {animated ? (
          <HomeCardsNavRow accent={accent || 'domain'} ariaLabel={title}>
            {cards}
          </HomeCardsNavRow>
        ) : (
          <HomePreviewRow>{cards}</HomePreviewRow>
        )}
      </div>
    </section>
  );
}
