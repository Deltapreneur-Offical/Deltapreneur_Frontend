import ListingCardShell from '../listings/ListingCardShell';
import HomePreviewCardShell from './HomePreviewCardShell';
import { SkeletonBone } from '../common/Skeleton';

function Bone({ animated, className }) {
  return <SkeletonBone animated={animated} className={className} />;
}

function BrowsePreviewSkeleton({ compact = false, animated = true }) {
  return (
    <article
      className={`home-preview-card-skeleton domain-listing-card domain-listing-card--browse home-preview-browse-card relative flex w-full flex-col overflow-hidden rounded-3xl bg-white${compact ? ' home-preview-card-skeleton--compact' : ''}`}
      aria-hidden="true"
    >
      <div className="home-preview-card-skeleton__cover">
        <Bone animated={animated} className="h-full w-full rounded-none opacity-70" />
      </div>

      <div className="domain-listing-card__body home-preview-card-skeleton__body">
        <div className="domain-listing-card__domain-row">
          <Bone animated={animated} className="h-4 min-w-0 flex-1 rounded-md" />
          <Bone animated={animated} className="h-2.5 w-2.5 flex-shrink-0 rounded-full" />
        </div>

        <div className="home-preview-card-skeleton__price-box">
          <Bone animated={animated} className="h-3.5 min-w-0 flex-1 rounded-md" />
          <Bone animated={animated} className="h-[1.875rem] w-[1.875rem] flex-shrink-0 rounded-full" />
        </div>

        <div className="listing-card-stats-footer home-preview-card-skeleton__stats">
          <div className="listing-card-stats-footer__group listing-card-stats-footer__group--split">
            <Bone animated={animated} className="h-3 w-12 rounded-md" />
            <Bone animated={animated} className="h-3 w-10 rounded-md justify-self-end" />
          </div>
        </div>
      </div>
    </article>
  );
}

function AuctionPreviewSkeleton({ animated = true }) {
  return (
    <article
      className="home-preview-card-skeleton home-preview-card-skeleton--auction domain-listing-card home-auction-preview-card home-auction-preview-card--home-preview home-auction-preview-card--homepage-content relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl bg-white"
      aria-hidden="true"
    >
      <div className="domain-listing-card__body home-auction-preview-card__body flex flex-col flex-1 gap-1.5 p-3">
        <div className="home-auction-preview-card__content flex flex-col flex-1 gap-1.5">
          <div className="home-auction-preview-card__homepage-topline">
            <Bone animated={animated} className="h-5 w-[5.5rem] rounded-full" />
            <Bone animated={animated} className="h-8 w-8 flex-shrink-0 rounded-full" />
          </div>
          <Bone animated={animated} className="h-3 w-[7.5rem] rounded-md" />
          <Bone animated={animated} className="h-5 w-[92%] rounded-md" />
          <Bone animated={animated} className="h-5 w-[58%] rounded-md" />
          <div className="home-auction-preview-card__current-bid">
            <Bone animated={animated} className="mb-1 h-2.5 w-16 rounded-md" />
            <Bone animated={animated} className="h-5 w-24 rounded-md" />
          </div>
          <div className="home-auction-preview-card__metrics-row flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Bone animated={animated} className="mb-1 h-2.5 w-[4.75rem] rounded-md" />
              <Bone animated={animated} className="h-4 w-28 rounded-md" />
            </div>
            <Bone animated={animated} className="h-8 w-8 flex-shrink-0 rounded-full" />
          </div>
        </div>
        <Bone animated={animated} className="h-3.5 w-16 rounded-md" />
      </div>
    </article>
  );
}

/** Homepage preview skeleton — neutral shell until real card data loads. */
export default function HomePreviewCardSkeleton({ variant = 'browse', compact = false, animated = false }) {
  if (variant === 'auction') {
    return (
      <HomePreviewCardShell accent="auction" className="home-preview-card-skeleton-shell">
        <AuctionPreviewSkeleton animated={animated} />
      </HomePreviewCardShell>
    );
  }

  return (
    <ListingCardShell className="home-preview-card-shell home-preview-card-skeleton-shell">
      <div className="home-preview-card-skeleton-border w-full">
        <div className="home-preview-card-border__inner w-full">
          <BrowsePreviewSkeleton compact={compact} animated={animated} />
        </div>
      </div>
    </ListingCardShell>
  );
}
