import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import verifiedIcon from '../../assets/Verified_Icon.png';
import { useCurrency } from '../../context/CurrencyContext';
import { isCreatorProfileComplete } from '../../utils/creatorProfile';
import { formatCreatorExpectedRate } from '../../utils/creatorExpectedRate';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import ListingCardStatsFooter from '../listings/ListingCardStatsFooter';
import '../../styles/domain-listing-cards.css';

function formatLabel(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/_/g, ' ').trim();
}

function CreatorCover({ imageUrl, name, verified, onError }) {
  return (
    <div className="domain-listing-card__cover">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="domain-listing-card__cover-img"
          onError={onError}
          aria-hidden
        />
      ) : (
        <div className="domain-listing-card__cover-fallback" aria-hidden>
          <span className="domain-listing-card__cover-fallback-domain">
            {name || 'Creator'}
          </span>
        </div>
      )}
      {verified ? (
        <img
          src={verifiedIcon}
          alt=""
          className="domain-listing-card__verified-icon"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function CreatorPriceBox({ amount, onView, viewDetailsLabel, profileId }) {
  const navigate = useNavigate();

  if (!amount) return null;

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleClick = (e) => {
    stop(e);
    if (profileId) {
      navigateToListingDetail(navigate, 'community', profileId);
    }
  };

  return (
    <div className="domain-listing-card__price-box domain-listing-card__price-box--auction">
      <div className="domain-listing-card__price-text min-w-0">
        <span className="domain-listing-card__price-value truncate">{amount}</span>
      </div>

      <button
        type="button"
        className="domain-listing-card__price-cta"
        aria-label={viewDetailsLabel}
        onClick={handleClick}
      >
        <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

export default function HomeCreatorListingCard({
  profile,
  likeState,
  onLike,
  onView,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [imgFailed, setImgFailed] = useState(false);

  if (!profile) return null;
  if (!isCreatorProfileComplete(profile)) return null;

  const imageUrl = profile.imageUrl || profile.image_url;
  const displayImage = imageUrl && !imgFailed ? imageUrl : null;
  const name = profile.name || t('listingCardAnonymous');
  const industryLabel = formatLabel(profile.industry);
  const roleLabel = formatLabel(profile.role);
  const skills = profile.skills?.split(',').map((s) => s.trim()).filter(Boolean) || [];
  const subtitle = skills[0] || roleLabel || name;
  const displayRate = formatCreatorExpectedRate(profile, formatPrice);
  const showPrice = Boolean(displayRate);
  const viewCount = Number(profile.views ?? profile.view_count ?? 0);
  const profileId = profile.id ?? profile.communityId ?? profile.creatorId ?? profile.community_id ?? profile.creator_id;
  const viewDetailsLabel = t('listingCardViewDetails', { defaultValue: 'View details' });

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl, profile.id]);

  const stop = (e) => e.stopPropagation();

  const handleView = onView
    ? (e) => {
      stop(e);
      onView();
    }
    : undefined;

  return (
    <article
      className="domain-listing-card domain-listing-card--browse home-preview-browse-card home-creator-listing-card card-glow-hover relative flex w-full flex-col overflow-hidden rounded-3xl bg-white cursor-pointer"
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onView?.(); }}
    >
      <CreatorCover
        imageUrl={displayImage}
        name={name}
        verified={isCreatorProfileComplete(profile)}
        onError={() => setImgFailed(true)}
      />

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p className="domain-listing-card__domain" title={name}>
            {name}
          </p>
        </div>

        <p className="text-[0.78rem] text-slate-500 leading-snug m-0 break-words">
          {subtitle}
        </p>

        {industryLabel ? (
          <span className="inline-block text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-400">
            {industryLabel}
          </span>
        ) : null}

        {showPrice ? (
          <CreatorPriceBox
            amount={displayRate}
            onView={handleView}
            profileId={profileId}
            viewDetailsLabel={viewDetailsLabel}
          />
        ) : null}

        <ListingCardStatsFooter
          viewCount={viewCount}
          likeState={likeState}
          onLike={onLike}
          onView={handleView}
          showCta={false}
          layout="creator-centered"
          className="domain-listing-card__stats mt-auto"
        />
      </div>
    </article>
  );
}
