import { Eye } from 'lucide-react';
import LikeButton from '../common/LikeButton';

export default function ListingStatsRow({
  views = 0,
  likeState,
  onLike,
  className = '',
}) {
  return (
    <div className={`listing-stats-row ${className}`.trim()}>
      <span className="listing-stats-row__item listing-stats-row__item--views">
        <Eye className="listing-stats-row__icon" strokeWidth={1.75} aria-hidden="true" />
        <span className="listing-stats-row__value">{views || 0}</span>
      </span>
      {onLike ? (
        <LikeButton
          liked={likeState?.liked}
          count={likeState?.count}
          onToggle={onLike}
        />
      ) : null}
    </div>
  );
}
