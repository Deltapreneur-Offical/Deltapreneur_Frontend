import { useRef, useState } from 'react';
import { 
  Briefcase, 
  Code, 
  MapPin, 
  User2, 
  Building, 
  Clock, 
  CheckCircle2,
  Globe,
  Lightbulb,
  Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import cobrotherViewMark from '../../assets/Cobrother_Profile.png';
import { isCreatorProfileComplete, isCreatorProfileVisible } from '../../utils/creatorProfile';
import LikeButton from '../common/LikeButton';
import { EditIcon } from '../common/EditActionLabel';
import CreatorExpectedRateCard from '../creators/CreatorExpectedRateCard';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import TruncatedTextTooltip from '../common/TruncatedTextTooltip';
import TruncatedItemsTooltip from '../common/TruncatedItemsTooltip';
import verifiedIcon from '../../assets/Verified_Icon.png';
import VaProfilePhoto from '../virtual-assistant/VaProfilePhoto';
import { getVirtualAssistantDetailPath } from '../../utils/listingNavigation';
import { useAuth } from '../../context/AuthContext';
import '../../styles/domain-listing-cards.css';
import '../../styles/virtual-assistant-listing-card.css';

function formatLabel(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/_/g, ' ').trim();
}

function isVirtualAssistantProfile(profile) {
  const reference = profile?.referenceNumber || profile?.reference_number || '';
  return reference.startsWith('CB-VA') || profile?.applicationNumber != null;
}

function CreatorAvatar({ imageUrl, name, profile }) {
  const initial = name?.[0]?.toUpperCase() || '?';
  const [failedUrl, setFailedUrl] = useState(null);

  if (profile && isVirtualAssistantProfile(profile)) {
    return (
      <div className="creator-profile-card__avatar-container">
        <VaProfilePhoto
          source={{ ...profile, profilePhotoUrl: imageUrl || profile.profilePhotoUrl }}
          applicationId={profile.id}
          refreshScope="public"
          alt={name || 'Virtual Assistant'}
          className="creator-profile-card__avatar"
          fallbackClassName="creator-profile-card__avatar creator-profile-card__avatar--fallback"
        />
      </div>
    );
  }

  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  return (
    <div className="creator-profile-card__avatar-container">
      {showImage ? (
        <img
          src={imageUrl}
          alt={name || 'Creator'}
          className="creator-profile-card__avatar"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <div className="creator-profile-card__avatar creator-profile-card__avatar--fallback" aria-hidden>
          {initial}
        </div>
      )}
    </div>
  );
}

export default function CommunityListingCard({
  profile,
  isMe,
  onView,
  onEdit,
  onHire,
  likeState,
  onLike,
  skipVisibilityCheck = false,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cardRef = useRef(null);
  const [failedCoverUrl, setFailedCoverUrl] = useState(null);

  if (!profile) return null;
  if (!isMe && !skipVisibilityCheck && !isCreatorProfileVisible(profile)) return null;

  const imageUrl = profile.imageUrl || profile.image_url || null;
  const rawCover =
    profile.coverImageUrl
    || profile.cover_image_url
    || imageUrl;
  const coverImageUrl = rawCover && failedCoverUrl !== rawCover ? rawCover : null;
    
  const skills = profile.skills ? profile.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const roleLabel = formatLabel(profile.role);
  const industryLabel = formatLabel(profile.industry);
  const locationLabel = formatLabel(profile.location);
  const primarySkill = skills[0] || '';
  const viewCount = Number(profile.views ?? profile.view_count ?? 0);
  const rawExp = profile.experience || profile.years_experience || '5+ Years';
  const expLabel = /^\d+$/.test(String(rawExp).trim()) ? `${String(rawExp).trim()}+ Years` : rawExp;
  const workTypeLabel = formatLabel(profile.workType || profile.work_type || 'Full-time');
  const description = profile.about || profile.description || profile.about_me || 'Building scalable tech products and solving real world problems.';
  const isVa = isVirtualAssistantProfile(profile);
  // Prefer live likeState from useLikes — profile.likeCount is a stale seed.
  const vaLikeCount = Number(likeState?.count ?? profile.likeCount ?? profile.like_count ?? 0);

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleShare = async (e) => {
    stop(e);
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const path = getVirtualAssistantDetailPath(profile?.id);
    const shareUrl = `${base}${path}${user?.id ? `?ref=${user.id}` : ''}`;
    const shareName = profile?.fullName || profile?.name || 'Virtual Assistant';
    const shareSubject = `Check out this virtual assistant on Deltapreneur: ${shareName}`;
    const shareText = `Check out this virtual assistant on Deltapreneur!\n\n${shareSubject}\n\n${shareUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareSubject, text: shareText, url: shareUrl });
        return;
      } catch {
        // Fall through.
      }
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Ignore if blocked.
    }
  };
  const interactive = Boolean(onView);

  const handleCardClick = (e) => {
    if (!onView) return;
    if (e?.target && e.target.closest && e.target.closest('button, a, input, textarea, select, label, [role="link"]')) return;
    onView();
  };

  const handleCardKeyDown = (e) => {
    if (!onView) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); onView(); }
  };

  if (isVa) {
    return (
      <article
        ref={cardRef}
        className={`domain-listing-card virtual-assistant-listing-card community-listing-card card-glow-hover relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white${isMe ? ' virtual-assistant-listing-card--owner' : ''}${interactive ? ' cursor-pointer' : ''}`}
        onClick={interactive ? handleCardClick : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? handleCardKeyDown : undefined}
      >
        <div className="va-listing-card__header">
          <div className="domain-listing-card__cover va-listing-card__cover">
            <div className="va-listing-card__cover-inner">
              <div className="creator-profile-card__avatar-container">
                <VaProfilePhoto
                  source={{ ...profile, profilePhotoUrl: imageUrl || profile.profilePhotoUrl || profile.profile_photo_url }}
                  applicationId={profile.id}
                  refreshScope="public"
                  alt=""
                  className="creator-profile-card__avatar"
                  fallbackClassName="creator-profile-card__avatar creator-profile-card__avatar--fallback"
                />
              </div>
            </div>
            <div className="domain-listing-card__share-container">
              <button
                type="button"
                className="domain-listing-card__share-btn"
                onClick={handleShare}
                title={t('listingCardShare', { defaultValue: 'Share' })}
                aria-label={t('listingCardShare', { defaultValue: 'Share' })}
              >
                <Share2 size={18} strokeWidth={2} />
              </button>
            </div>
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

          <div className="va-listing-card__title-block">
            <div className="va-listing-card__name-row">
              <h3
                className="va-listing-card__name"
                title={profile.name || undefined}
              >
                <OverflowMarqueeText text={profile.name || t('listingCardAnonymous')} />
              </h3>
              {isCreatorProfileComplete(profile) ? (
                <img
                  src={verifiedIcon}
                  alt="Verified"
                  className="domain-listing-card__verified-badge"
                />
              ) : null}
            </div>
            {(isMe || roleLabel) ? (
              <span className="creator-profile-card__badge">
                {isMe ? t('listingCardOwner', 'Owner').toUpperCase() : roleLabel.toUpperCase()}
              </span>
            ) : null}
          </div>
        </div>

        <div className="domain-listing-card__body">
          <div className="creator-profile-card__stats-grid va-listing-card__stats-grid va-listing-card__stats-grid--two-col">
            <div className="stat-col">
              <Briefcase size={15} className="stat-icon" />
              <TruncatedTextTooltip text={expLabel}>
                <span className="stat-value">{expLabel}</span>
              </TruncatedTextTooltip>
              <span className="stat-label">Experience</span>
            </div>
            <div className="stat-col stat-col--center">
              <Clock size={15} className="stat-icon" />
              <span className="stat-value">{workTypeLabel}</span>
              <span className="stat-label">Work Type</span>
            </div>
          </div>

          <CreatorExpectedRateCard
            profile={profile}
            variant="domain"
            onView={interactive && !onHire ? () => onView() : undefined}
            onHire={interactive && onHire ? () => onHire() : undefined}
            hireLabel={onHire ? 'Hire virtual assistant' : undefined}
          />

          <ListingCardStatsFooter
            viewCount={viewCount}
            likeState={{
              liked: likeState?.liked,
              count: Number.isFinite(vaLikeCount) ? vaLikeCount : 0,
            }}
            onLike={onLike}
            likesFirst
            showCta={false}
            className="domain-listing-card__stats domain-listing-card__stats--split"
          />
        </div>
      </article>
    );
  }

  return (
    <article
      ref={cardRef}
      className={`creator-profile-card community-listing-card card-glow-hover${isVa ? ' virtual-assistant-listing-card' : ''}${isMe ? ' creator-profile-card--owner' : ''}`}
      onClick={interactive ? handleCardClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleCardKeyDown : undefined}
    >
      <div className="creator-profile-card__banner">
        {isVirtualAssistantProfile(profile) && (coverImageUrl || profile.profilePhotoUrl || profile.profile_photo_url) ? (
          <>
            <VaProfilePhoto
              source={{ ...profile, profilePhotoUrl: coverImageUrl || profile.profilePhotoUrl }}
              applicationId={profile.id}
              refreshScope="public"
              alt=""
              className="creator-profile-card__banner-image"
              fallbackClassName="creator-profile-card__banner-fallback"
              fallback="icon"
              fallbackIconSize={0}
              imgProps={{ loading: 'lazy', decoding: 'async', 'aria-hidden': true }}
            />
            <div className="creator-profile-card__banner-overlay" aria-hidden />
          </>
        ) : coverImageUrl ? (
          <>
            <img
              src={coverImageUrl}
              alt=""
              className="creator-profile-card__banner-image"
              loading="lazy"
              decoding="async"
              aria-hidden
              onError={() => setFailedCoverUrl(coverImageUrl)}
            />
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
        <div className="creator-profile-card__top-section">
          <CreatorAvatar imageUrl={imageUrl} name={profile.name} profile={profile} />
          
          <div className="creator-profile-card__header-right">
             <div className="creator-profile-card__name-section">
                <div className="flex items-center gap-2 w-full">
                  <h3
                    className="creator-profile-card__name flex-1 min-w-0"
                    title={profile.name || undefined}
                    style={{
                      textOverflow: 'clip',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    <OverflowMarqueeText text={profile.name || t('listingCardAnonymous')} />
                  </h3>
                  {isCreatorProfileComplete(profile) ? (
                    <img
                      src={verifiedIcon}
                      alt="Verified"
                      className="domain-listing-card__verified-badge"
                    />
                  ) : null}
                </div>
                <div className="creator-profile-card__badge-slot">
                  {isMe ? (
                    <span className="creator-profile-card__badge creator-profile-card__badge--owner">
                      {t('listingCardOwner', 'Owner')}
                    </span>
                  ) : roleLabel ? (
                    <span className="creator-profile-card__badge">{roleLabel}</span>
                  ) : null}
                </div>
             </div>

             {isVa ? (
               <button
                 type="button"
                 className="domain-listing-card__share-btn"
                 onClick={handleShare}
                 title={t('listingCardShare', { defaultValue: 'Share' })}
                 aria-label={t('listingCardShare', { defaultValue: 'Share' })}
               >
                 <Share2 size={18} strokeWidth={2} />
               </button>
             ) : null}
             
          </div>
        </div>

        <hr className="creator-profile-card__divider mt-3" />

        <div className="creator-profile-card__stats-grid">
           <div className="stat-col">
              <Briefcase size={15} className="stat-icon" />
              <TruncatedTextTooltip text={expLabel}>
                <span className="stat-value">{expLabel}</span>
              </TruncatedTextTooltip>
              <span className="stat-label">Experience</span>
           </div>
           <div className="stat-col stat-col--center">
              <Building size={15} className="stat-icon" />
              <span className="stat-value">{industryLabel || 'Tech'}</span>
              <span className="stat-label">Industry</span>
           </div>
           <div className="stat-col">
              <Clock size={15} className="stat-icon" />
              <span className="stat-value">{workTypeLabel}</span>
              <span className="stat-label">Work Type</span>
           </div>
        </div>

        <CreatorExpectedRateCard
          profile={profile}
          onView={interactive && !onHire ? () => onView() : undefined}
          onHire={interactive && onHire ? () => onHire() : undefined}
          hireLabel={onHire ? 'Hire virtual assistant' : undefined}
        />

        <hr className="creator-profile-card__divider" />

        <div
          className="creator-profile-card__footer"
          onClick={stop}
          onMouseDown={stop}
          role="presentation"
        >
          <div className="footer-left">
             <span className="creator-profile-card__views" title={t('creatorProfileViews', 'Profile views')}>
               <img src={cobrotherViewMark} alt="" aria-hidden className="creator-profile-card__brand-mark" />
               <span>{viewCount}</span>
             </span>
          </div>
          <div className="footer-right">
            {onLike ? (
              <LikeButton
                liked={likeState?.liked}
                count={likeState?.count}
                onToggle={onLike}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

