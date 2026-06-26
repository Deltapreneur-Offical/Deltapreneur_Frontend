import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import cobrotherViewMark from '../../assets/Cobrother_Profile.png';
import { isCreatorProfileComplete } from '../../utils/creatorProfile';
// Follow button disabled until creator follow UX is finalized.
import LikeButton from '../common/LikeButton';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import { EditIcon } from '../common/EditActionLabel';
import CreatorExpectedRateCard from '../creators/CreatorExpectedRateCard';
import CreatorPreviewModal from '../auctions/CreatorPreviewModal';
import OverflowMarqueeText from '../common/OverflowMarqueeText';

function formatLabel(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/_/g, ' ').trim();
}

function CreatorAvatar({ imageUrl, name }) {
  const initial = name?.[0]?.toUpperCase() || '?';

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || 'Creator'}
        className="creator-profile-card__avatar"
      />
    );
  }

  return (
    <div className="creator-profile-card__avatar creator-profile-card__avatar--fallback" aria-hidden>
      {initial}
    </div>
  );
}

export default function CommunityListingCard({
  profile,
  isMe,
  onView,
  onEdit,
  likeState,
  onLike,
  followState,
  onFollow,
  followLoading = false,
}) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);
  const cardRef = useRef(null);

  if (!profile) return null;
  if (!isMe && !isCreatorProfileComplete(profile)) return null;

  const imageUrl = profile.imageUrl || profile.image_url || null;
  const coverImageUrl =
    profile.coverImageUrl
    || profile.cover_image_url
    || imageUrl;
  const skills = profile.skills?.split(',').map((s) => s.trim()).filter(Boolean) || [];
  const roleLabel = formatLabel(profile.role);
  const industryLabel = formatLabel(profile.industry);
  const locationLabel = formatLabel(profile.location);
  const primarySkill = skills[0] || '';
  const headline = [roleLabel, industryLabel].filter(Boolean).join(' · ');
  const metaLine = [locationLabel, primarySkill].filter(Boolean).join(' · ');
  const viewCount = Number(profile.views ?? profile.view_count ?? 0);

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };
  const interactive = Boolean(onView) && !isMe;
  const auctionLike = {
    community: profile,
    featured: Boolean(profile?.featured),
    minBidPrice: 0,
    currentHighestBid: 0,
    endTime: null,
  };

  return (
    <article
      ref={cardRef}
      className={`creator-profile-card community-listing-card card-glow-hover${isMe ? ' creator-profile-card--owner' : ''}`}
      onClick={interactive ? () => setShowPreview(true) : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter') setShowPreview(true); } : undefined}
    >
      <CreatorPreviewModal
        auction={auctionLike}
        open={showPreview}
        onClose={() => {
          setShowPreview(false);
          cardRef.current?.focus?.();
        }}
        onPlaceBid={onView}
      />
      <div className="creator-profile-card__banner">
        {coverImageUrl ? (
          <>
            <img src={coverImageUrl} alt="" className="creator-profile-card__banner-image" aria-hidden />
            <div className="creator-profile-card__banner-overlay" aria-hidden />
          </>
        ) : (
          <div className="creator-profile-card__banner-fallback" aria-hidden />
        )}

        {isMe && onEdit ? (
          <button
            type="button"
            className="creator-profile-card__edit"
            aria-label={t('edit')}
            onClick={(e) => {
              stop(e);
              onEdit();
            }}
          >
            <EditIcon size={14} className="text-slate-700" />
          </button>
        ) : null}
      </div>

      <div className="creator-profile-card__body">
        <div className="creator-profile-card__avatar-wrap">
          <CreatorAvatar imageUrl={imageUrl} name={profile.name} />
        </div>

        <div className="creator-profile-card__content">
          <h3 className="creator-profile-card__name" title={profile.name || undefined}>
            <OverflowMarqueeText text={profile.name || t('listingCardAnonymous')} />
          </h3>

          <div className="creator-profile-card__badge-slot">
            {isMe ? (
              <span className="creator-profile-card__badge creator-profile-card__badge--owner">
                {t('listingCardOwner', 'Owner')}
              </span>
            ) : roleLabel ? (
              <span className="creator-profile-card__badge">{roleLabel}</span>
            ) : (
              <span className="creator-profile-card__badge-placeholder" aria-hidden />
            )}
          </div>

          <p className="creator-profile-card__headline">
            {headline ? headline.toUpperCase() : '\u00A0'}
          </p>

          <p className="creator-profile-card__meta">
            {metaLine || '\u00A0'}
          </p>

          <CreatorExpectedRateCard profile={profile} />
        </div>

        {/* Follow button disabled until creator follow UX is finalized */}

        <ListingCardStatsFooter
          viewCount={viewCount}
          likeState={likeState}
          onLike={onLike}
          onView={onView}
          layout="creator-centered"
          className="creator-profile-card__footer"
        />
      </div>
    </article>
  );
}
