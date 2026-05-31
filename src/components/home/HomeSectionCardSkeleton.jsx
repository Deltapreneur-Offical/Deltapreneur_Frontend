import SkeletonCard from '../common/Skeleton';
import ListingCardShell from '../listings/ListingCardShell';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';

const SKELETON_COUNT = 5;

export default function HomeSectionCardSkeleton({ title, to }) {
  return (
    <section className="bg-white py-4 md:py-6">
      <div className="w-full">
        <HomeSectionHeader title={title} to={to} />
        <HomePreviewRow>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <HomePreviewRowItem key={i}>
              <ListingCardShell>
                <SkeletonCard />
              </ListingCardShell>
            </HomePreviewRowItem>
          ))}
        </HomePreviewRow>
      </div>
    </section>
  );
}
