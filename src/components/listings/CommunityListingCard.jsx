import { useRef, useState } from 'react';
import { 
  ArrowUpRight,
  AtSign,
  Briefcase, 
  Building, 
  Clock, 
  FileText,
  FolderOpen,
  Globe,
  PlayCircle,
  Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLinkedInProfileUrl, isCreatorProfileVisible } from '../../utils/creatorProfile';
// Concept 5 Deltapreneur card styles are appended in community-concept5-card.css.
import { EditIcon } from '../common/EditActionLabel';
import CreatorExpectedRateCard from '../creators/CreatorExpectedRateCard';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import TruncatedTextTooltip from '../common/TruncatedTextTooltip';
import VaProfilePhoto from '../virtual-assistant/VaProfilePhoto';
import { getListingBrowsePath, getVirtualAssistantDetailPath } from '../../utils/listingNavigation';
import { useAuth } from '../../context/AuthContext';
import { normalizePublicImageUrl } from '../../utils/imageUrl';
import bluetintCover from '../../assets/bluetint.png';
import '../../styles/domain-listing-cards.css';
import '../../styles/virtual-assistant-listing-card.css';
import '../../styles/community-concept5-card.css';

function formatLabel(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/_/g, ' ').trim();
}

function isVirtualAssistantProfile(profile) {
  const reference = profile?.referenceNumber || profile?.reference_number || '';
  return reference.startsWith('CB-VA') || profile?.applicationNumber != null;
}

// Brand glyphs (lucide-react no longer ships brand icons) — inline SVGs,
// same approach as LinkedInIcon in CommunityPage.jsx.
function LinkedinGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YoutubeGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function GithubGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** Featured-link metadata for the Concept 5 card — maps EXISTING columns to labels/icons/colors. */
const CONCEPT5_FEATURED_LINK_META = {
  pitchDeckLink: { label: 'Pitch Deck', Icon: FileText, tone: 'blue' },
  portfolioWebsiteLink: { label: 'Portfolio', Icon: FolderOpen, tone: 'purple' },
  youtubeVideoLink: { label: 'YouTube', Icon: YoutubeGlyph, tone: 'red' },
  githubProfile: { label: 'GitHub', Icon: GithubGlyph, tone: 'slate' },
  socialMediaProfile: { label: 'Social', Icon: AtSign, tone: 'sky' },
  introductionVideoLink: { label: 'Demo / Video', Icon: PlayCircle, tone: 'amber' },
};
const CONCEPT5_FEATURED_LINK_FIELDS = Object.keys(CONCEPT5_FEATURED_LINK_META);

/**
 * Featured Links section — always rendered so every Concept 5 card keeps the
 * same structure. Tiles show directly (matching the reference design); when
 * there are no links a clean empty state keeps the layout stable. Full data
 * and clickable links also live on the preview page opened via the card.
 */
function Concept5FeaturedLinks({ profile }) {
  const links = CONCEPT5_FEATURED_LINK_FIELDS
    .map((field) => {
      const raw = profile?.[field] ?? profile?.[field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] ?? '';
      const url = typeof raw === 'string' ? raw.trim() : '';
      return url ? { field, url, ...CONCEPT5_FEATURED_LINK_META[field] } : null;
    })
    .filter(Boolean);

  return (
    <div className="concept5-card__links-section">
      <div className="concept5-card__links-title">Featured Links</div>
      {links.length > 0 ? (
        <div className="concept5-card__links-grid">
          {links.map(({ field, url, label, Icon, tone }) => (
            <a
              key={field}
              href={url}
              target="_blank"
              rel="noreferrer"
              title={url}
              className={`concept5-card__link concept5-card__link--${tone}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon size={22} strokeWidth={2} aria-hidden />
              <span>{label}</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="concept5-card__links-empty">No featured links added.</div>
      )}
    </div>
  );
}

function CreatorAvatar({ imageUrl, name, profile }) {
  const normalizedUrl = normalizePublicImageUrl(imageUrl);
  const initial = name?.[0]?.toUpperCase() || '?';
  const [failedUrl, setFailedUrl] = useState(null);

  if (profile && isVirtualAssistantProfile(profile)) {
    return (
      <div className="creator-profile-card__avatar-container">
        <VaProfilePhoto
          source={{ ...profile, profilePhotoUrl: normalizedUrl || profile.profilePhotoUrl }}
          applicationId={profile.id}
          refreshScope="public"
          alt={name || 'Virtual Assistant'}
          className="creator-profile-card__avatar"
          fallbackClassName="creator-profile-card__avatar creator-profile-card__avatar--fallback"
        />
      </div>
    );
  }

  const showImage = Boolean(normalizedUrl) && failedUrl !== normalizedUrl;

  return (
    <div className="creator-profile-card__avatar-container">
      {showImage ? (
        <img
          src={normalizedUrl}
          alt={name || 'Deltapreneur'}
          className="creator-profile-card__avatar"
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(normalizedUrl)}
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
  /** Homepage DeltaOp cards: show existing availability as a top-left status badge. */
  showAvailabilityBadge = false,
  priceLabelOutside = false,
  compensationLabel = 'Compensation',
  hideStatsFooter = false,
  /** Homepage Deltapreneurs strip — enables mobile layout lock class. */
  homepageContent = false,
  /** Homepage Deltapreneurs desktop/tablet: reuse the Venture homepage arrow button implementation. */
  homepageArrow = false,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cardRef = useRef(null);

  if (!profile) return null;
  if (!isMe && !skipVisibilityCheck && !isCreatorProfileVisible(profile)) return null;

  const imageUrl = profile.imageUrl || profile.image_url || null;
  const roleLabel = formatLabel(profile.role);
  const industryLabel = formatLabel(profile.industry);
  const viewCount = Number(profile.views ?? profile.view_count ?? 0);
  const rawExp = profile.experience || profile.years_experience || '5+ Years';
  const expLabel = /^\d+$/.test(String(rawExp).trim()) ? `${String(rawExp).trim()}+ Years` : rawExp;
  const workTypeLabel = formatLabel(profile.preferredWorkType || profile.preferred_work_type || profile.workType || profile.work_type || 'Full-time');
  const isVa = isVirtualAssistantProfile(profile);
  // Homepage DeltaOp badges: always show AVAILABLE (never Allocated/Busy).
  let availabilityLabel = '';
  let availabilityTone = 'default';
  if (showAvailabilityBadge) {
    availabilityLabel = 'Available';
    availabilityTone = 'available';
  }
  // Prefer live likeState from useLikes — profile.likeCount is a stale seed.
  const vaLikeCount = Number(likeState?.count ?? profile.likeCount ?? profile.like_count ?? 0);

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleShare = async (e) => {
    stop(e);
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const path = isVirtualAssistantProfile(profile)
      ? getVirtualAssistantDetailPath(profile?.id)
      : getListingBrowsePath('community', profile?.id);
    const join = path.includes('?') ? '&' : '?';
    const shareUrl = `${base}${path}${user?.id ? `${join}ref=${user.id}` : ''}`;
    const shareName = profile?.fullName || profile?.name || 'Deltapreneur';
    const shareSubject = `Check out this Deltapreneur profile: ${shareName}`;
    const shareText = `Check out this Deltapreneur profile!\n\n${shareSubject}\n${shareUrl}`;

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
            {showAvailabilityBadge && availabilityLabel ? (
              <span
                className={`va-listing-card__status-badge va-listing-card__status-badge--${availabilityTone}`}
              >
                {availabilityLabel}
              </span>
            ) : null}
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
            </div>
            {(isMe || roleLabel) ? (
              <span
                className="creator-profile-card__badge"
                data-experience={expLabel || undefined}
              >
                {isMe ? t('listingCardOwner', 'Owner').toUpperCase() : roleLabel}
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
            <div className={`stat-col stat-col--center${availabilityTone === 'allocated' ? ' stat-col--busy' : ''}`}>
              <Clock size={15} className="stat-icon" />
              <span className="stat-value">{workTypeLabel}</span>
              <span className="stat-label">Work Type</span>
            </div>
          </div>

          <CreatorExpectedRateCard
            profile={profile}
            variant="domain"
            labelOutside={priceLabelOutside}
            compensationLabel={compensationLabel}
            onView={interactive && !onHire ? () => onView() : undefined}
            onHire={interactive && onHire ? () => onHire() : undefined}
            hireLabel={onHire ? 'Hire virtual assistant' : undefined}
            homepageArrow={homepageArrow}
          />

          {!hideStatsFooter ? (
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
          ) : null}
        </div>
      </article>
    );
  }

  // ── Concept 5 Deltapreneur card ────────────────────────────────────────────
  // Fixed structure for every profile; missing data renders disabled/empty
  // states instead of collapsing the layout. Views/likes APIs and handlers
  // stay wired above — only their visible counters are hidden (legacy stats
  // footer remains mounted inside .concept5-card__legacy-stats, display:none).
  const linkedInUrl = getLinkedInProfileUrl(profile);
  const websiteUrl = (profile.companyWebsite || profile.company_website || '').trim();
  const companyName = profile.companyName || profile.company_name || '';
  const headline = profile.headline || '';

  return (
    <article
      ref={cardRef}
      className={`concept5-card domain-listing-card community-listing-card card-glow-hover relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white${isMe ? ' community-listing-card--owner' : ''}${homepageContent ? ' community-listing-card--homepage-content' : ''}${interactive ? ' cursor-pointer' : ''}`}
      onClick={interactive ? handleCardClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleCardKeyDown : undefined}
    >
      {/* 1. Soft blue wave header (bluetint.png asset) + 2. circular photo */}
      <div className="concept5-card__header">
        <img src={bluetintCover} alt="" aria-hidden className="concept5-card__wave-img" />
        <div className="domain-listing-card__share-container concept5-card__share">
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
        {/* Owner-only pencil (top-left, matching Concept 5). Rendered ONLY when
            isMe — other users never see it. onEdit handler unchanged. */}
        {isMe && onEdit ? (
          <button
            type="button"
            className="concept5-card__edit"
            aria-label={t('edit')}
            title={t('edit', 'Edit profile')}
            onClick={(e) => {
              stop(e);
              onEdit();
            }}
          >
            <EditIcon size={16} className="text-slate-600" />
          </button>
        ) : null}
        <div className="concept5-card__avatar-wrap">
          <CreatorAvatar imageUrl={imageUrl} name={profile.name} profile={profile} />
        </div>
      </div>

      {/* 3. Full Name · 4. Company · 5. Industry pill · 6. Headline */}
      <div className="concept5-card__identity">
        <h3 className="concept5-card__name" title={profile.name || undefined}>
          {profile.name || t('listingCardAnonymous', 'Anonymous')}
        </h3>
        <div className="concept5-card__company" title={companyName || undefined}>
          {companyName || '\u00A0'}
        </div>
        <div className="concept5-card__industry-row">
          <span className="concept5-card__rule" aria-hidden />
          {industryLabel ? (
            <span className="concept5-card__industry-pill">{industryLabel}</span>
          ) : (
            <span className="concept5-card__industry-pill concept5-card__industry-pill--empty" aria-hidden>&nbsp;</span>
          )}
          <span className="concept5-card__rule" aria-hidden />
        </div>
        <div className="concept5-card__headline" title={headline || undefined}>
          {headline || '\u00A0'}
        </div>
      </div>

      {/* 7 + 8. LinkedIn / Website buttons — disabled state when URL missing */}
      <div className="concept5-card__actions">
        {linkedInUrl ? (
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noreferrer"
            className="concept5-card__btn concept5-card__btn--linkedin"
            onClick={(e) => e.stopPropagation()}
          >
            <LinkedinGlyph size={18} aria-hidden />
            <span>LinkedIn</span>
            <ArrowUpRight size={15} strokeWidth={2.5} aria-hidden />
          </a>
        ) : (
          <span
            className="concept5-card__btn concept5-card__btn--linkedin concept5-card__btn--disabled"
            aria-disabled="true"
            role="presentation"
          >
            <LinkedinGlyph size={18} aria-hidden />
            <span>LinkedIn</span>
            <ArrowUpRight size={15} strokeWidth={2.5} aria-hidden />
          </span>
        )}
        <span className="concept5-card__actions-divider" aria-hidden />
        {websiteUrl ? (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="concept5-card__btn concept5-card__btn--website"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe size={18} strokeWidth={2.25} aria-hidden />
            <span>Website</span>
            <ArrowUpRight size={15} strokeWidth={2.5} aria-hidden />
          </a>
        ) : (
          <span
            className="concept5-card__btn concept5-card__btn--website concept5-card__btn--disabled"
            aria-disabled="true"
            role="presentation"
          >
            <Globe size={18} strokeWidth={2.25} aria-hidden />
            <span>Website</span>
            <ArrowUpRight size={15} strokeWidth={2.5} aria-hidden />
          </span>
        )}
      </div>

      {/* 9. Featured Links — fixed container; empty state keeps the design stable */}
      <div className="concept5-card__body">
        <Concept5FeaturedLinks profile={profile} />

        {/* Legacy sections preserved and hidden (restorable via CSS) — they keep
            the view/like handlers mounted exactly as before. */}
        <div className="concept5-card__legacy-stats" aria-hidden>
          <div className="creator-profile-card__stats-grid community-listing-card__stats-grid">
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
            variant="domain"
            labelOutside={priceLabelOutside}
            onView={interactive && !onHire ? () => onView() : undefined}
            onHire={interactive && onHire ? () => onHire() : undefined}
            hireLabel={onHire ? 'Hire virtual assistant' : undefined}
            homepageArrow={homepageArrow}
          />

          {!hideStatsFooter ? (
            <ListingCardStatsFooter
              viewCount={viewCount}
              likeState={{
                liked: likeState?.liked,
                count: Number(likeState?.count ?? 0),
              }}
              onLike={onLike}
              likesFirst
              showCta={false}
              className="domain-listing-card__stats domain-listing-card__stats--split"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

