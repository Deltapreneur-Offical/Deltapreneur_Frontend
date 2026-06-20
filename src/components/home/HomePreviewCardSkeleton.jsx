import ListingCardShell from '../listings/ListingCardShell';
import { SkeletonBone } from '../common/Skeleton';

function BrowsePreviewSkeleton({ compact = false }) {
  return (
    <article
      className={`home-preview-card-skeleton domain-listing-card domain-listing-card--browse home-preview-browse-card relative flex w-full flex-col overflow-hidden rounded-3xl bg-white${compact ? ' home-preview-card-skeleton--compact' : ''}`}
      aria-hidden="true"
    >
      <div className="home-preview-card-skeleton__cover">
        <SkeletonBone className="h-full w-full rounded-none opacity-70" />
      </div>

      <div className="domain-listing-card__body home-preview-card-skeleton__body">
        <div className="domain-listing-card__domain-row">
          <SkeletonBone className="h-4 min-w-0 flex-1 rounded-md" />
          <SkeletonBone className="h-2.5 w-2.5 flex-shrink-0 rounded-full" />
        </div>

        <div className="home-preview-card-skeleton__price-box">
          <SkeletonBone className="h-3.5 min-w-0 flex-1 rounded-md" />
          <SkeletonBone className="h-[1.875rem] w-[1.875rem] flex-shrink-0 rounded-full" />
        </div>

        <div className="listing-card-stats-footer home-preview-card-skeleton__stats">
          <div className="listing-card-stats-footer__group listing-card-stats-footer__group--split">
            <SkeletonBone className="h-3 w-12 rounded-md" />
            <SkeletonBone className="h-3 w-10 rounded-md justify-self-end" />
          </div>
        </div>
      </div>
    </article>
  );
}

function AuctionPreviewSkeleton() {
  return (
    <article
      className="home-preview-card-skeleton home-preview-card-skeleton--auction domain-listing-card domain-listing-card--browse home-preview-browse-card home-auction-preview-card relative flex w-full flex-col overflow-hidden rounded-3xl bg-white"
      aria-hidden="true"
    >
      <div className="home-preview-card-skeleton__cover home-preview-card-skeleton__cover--auction">
        <SkeletonBone className="h-full w-full rounded-none opacity-70" />
        <SkeletonBone className="home-preview-card-skeleton__badge absolute left-2 top-2 h-5 w-16 rounded-full" />
      </div>

      <div className="domain-listing-card__body home-auction-preview-card__body home-preview-card-skeleton__body">
        <div className="home-auction-preview-card__head">
          <div className="home-auction-preview-card__title-row min-w-0 flex-1">
            <SkeletonBone className="mb-2 h-4 w-[88%] rounded-md" />
            <SkeletonBone className="mb-2 h-3 w-[62%] rounded-md" />
            <SkeletonBone className="h-3 w-full rounded-md" />
            <SkeletonBone className="mt-1.5 h-3 w-[78%] rounded-md" />
          </div>
          <SkeletonBone className="h-2.5 w-2.5 flex-shrink-0 rounded-full" />
        </div>

        <div className="home-auction-preview-card__metrics">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="home-auction-preview-card__metric">
              <SkeletonBone className="mb-1.5 h-2.5 w-[70%] rounded-md" />
              <SkeletonBone className="h-3.5 w-[82%] rounded-md" />
            </div>
          ))}
        </div>

        <div className="home-preview-card-skeleton__price-box home-preview-card-skeleton__price-box--auction">
          <div className="min-w-0 flex-1">
            <SkeletonBone className="mb-1.5 h-2.5 w-16 rounded-md" />
            <SkeletonBone className="h-4 w-24 rounded-md" />
          </div>
          <SkeletonBone className="h-[1.875rem] w-[1.875rem] flex-shrink-0 rounded-full" />
        </div>
      </div>
    </article>
  );
}

/** Homepage preview skeleton — neutral shell until real card data loads. */
export default function HomePreviewCardSkeleton({ variant = 'browse', compact = false }) {
  return (
    <ListingCardShell className="home-preview-card-shell home-preview-card-skeleton-shell">
      <div className="home-preview-card-skeleton-border w-full">
        <div className="home-preview-card-border__inner w-full">
          {variant === 'auction' ? (
            <AuctionPreviewSkeleton />
          ) : (
            <BrowsePreviewSkeleton compact={compact} />
          )}
        </div>
      </div>
    </ListingCardShell>
  );
}
