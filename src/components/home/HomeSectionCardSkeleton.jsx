import HomePreviewCardSkeleton from './HomePreviewCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';

const SKELETON_COUNT = 5;

export default function HomeSectionCardSkeleton({
  title,
  to,
  variant = 'browse',
  compact = false,
}) {
  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full">
        <HomeSectionHeader title={title} to={to} />
        <HomePreviewRow animate={false}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <HomePreviewRowItem key={i}>
              <HomePreviewCardSkeleton variant={variant} compact={compact} />
            </HomePreviewRowItem>
          ))}
        </HomePreviewRow>
      </div>
    </section>
  );
}
