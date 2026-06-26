import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import cobrotherViewMark from '../../assets/Cobrother_Profile.png';
import LikeButton from '../common/LikeButton';

export default function ListingCardStatsFooter({
  viewCount = 0,
  likeState,
  onLike,
  onView,
  showCta = true,
  className = '',
  likesFirst = false,
  layout = 'default',
}) {
  const { t } = useTranslation();
  const isCreatorCentered = layout === 'creator-centered';

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      className={`listing-card-stats-footer ${isCreatorCentered ? 'listing-card-stats-footer--creator' : ''} ${className}`.trim()}
      onClick={stop}
      onMouseDown={stop}
      role="presentation"
    >
      {isCreatorCentered ? (
        <>
          <span
            className="listing-card-stats-footer__views"
            title={t('creatorProfileViews', 'Profile views')}
          >
            <img
              src={cobrotherViewMark}
              alt=""
              aria-hidden
              className="listing-card-stats-footer__mark"
            />
            <span>{Number(viewCount) || 0}</span>
          </span>

          {onView && showCta ? (
            <button
              type="button"
              className="listing-card-stats-footer__cta"
              aria-label={t('listingCardViewDetails', 'View details')}
              onClick={(e) => {
                stop(e);
                onView();
              }}
            >
              <ArrowRight size={17} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}

          {onLike ? (
            <LikeButton
              liked={likeState?.liked}
              count={likeState?.count}
              onToggle={onLike}
              size="sm"
            />
          ) : null}
        </>
      ) : (
        <>
          <div
            className={`listing-card-stats-footer__group${likesFirst ? ' listing-card-stats-footer__group--split' : ''}`}
          >
            <span
              className="listing-card-stats-footer__views"
              title={t('creatorProfileViews', 'Profile views')}
            >
              <img
                src={cobrotherViewMark}
                alt=""
                aria-hidden
                className="listing-card-stats-footer__mark"
              />
              <span>{Number(viewCount) || 0}</span>
            </span>
            {onLike ? (
              <LikeButton
                liked={likeState?.liked}
                count={likeState?.count}
                onToggle={onLike}
              />
            ) : null}
          </div>

          {onView && showCta ? (
            <button
              type="button"
              className="listing-card-stats-footer__cta"
              aria-label={t('listingCardViewDetails', 'View details')}
              onClick={(e) => {
                stop(e);
                onView();
              }}
            >
              <ArrowRight size={17} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
