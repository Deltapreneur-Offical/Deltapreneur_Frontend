import HomePreviewCardSkeleton from './HomePreviewCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeCardsNavRow from './HomeCardsNavRow';
import { HomePreviewRowItem } from './HomePreviewRow';

const SKELETON_COUNT = 5;

export default function HomeSectionCardSkeleton({
  title,
  to,
  accent,
  variant = 'browse',
  compact = false,
  hideHeader = false,
}) {
  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full">
        {!hideHeader && title ? (
          <HomeSectionHeader title={title} to={to} accent={accent} showViewAll={Boolean(to)} />
        ) : null}
        <HomeCardsNavRow accent={accent || 'domain'} ariaLabel={title}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <HomePreviewRowItem key={i}>
              <HomePreviewCardSkeleton variant={variant} compact={compact} />
            </HomePreviewRowItem>
          ))}
        </HomeCardsNavRow>
      </div>
    </section>
  );
}
