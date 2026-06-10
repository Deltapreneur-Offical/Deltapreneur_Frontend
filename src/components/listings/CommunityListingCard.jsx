import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import cobrotherViewMark from '../../assets/Cobrother_Profile.png';
import CreatorFollowButton from '../creators/CreatorFollowButton';
import LikeButton from '../common/LikeButton';
import { EditIcon } from '../common/EditActionLabel';

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
  const imageUrl = profile.imageUrl || profile.image_url || null;
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

  return (
    <article
      className={`creator-profile-card community-listing-card card-glow-hover${isMe ? ' creator-profile-card--owner' : ''}`}
    >
      <div className="creator-profile-card__banner">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="" className="creator-profile-card__banner-image" aria-hidden />
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
          <h3 className="creator-profile-card__name">
            {profile.name || t('listingCardAnonymous')}
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
        </div>

        {!isMe && onFollow ? (
          <div className="creator-profile-card__follow-row">
            <CreatorFollowButton
              following={followState?.following}
              count={followState?.count ?? profile.followerCount ?? profile.follower_count ?? 0}
              loading={followLoading}
              onToggle={onFollow}
            />
          </div>
        ) : null}

        <div
          className="creator-profile-card__footer"
          onClick={stop}
          onMouseDown={stop}
          role="presentation"
        >
          <div className="creator-profile-card__stat-group">
            <span
              className="creator-profile-card__views"
              title={t('creatorProfileViews', 'Profile views')}
            >
              <img
                src={cobrotherViewMark}
                alt=""
                aria-hidden
                className="creator-profile-card__brand-mark"
              />
              <span>{viewCount}</span>
            </span>
            {onLike ? (
              <LikeButton
                liked={likeState?.liked}
                count={likeState?.count}
                onToggle={onLike}
                forceRed
              />
            ) : null}
          </div>

          <button
            type="button"
            className="creator-profile-card__cta"
            aria-label={t('listingCardViewDetails', 'View details')}
            onClick={(e) => {
              stop(e);
              onView?.();
            }}
          >
            <ArrowRight size={17} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
