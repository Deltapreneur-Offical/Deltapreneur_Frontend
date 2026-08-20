import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { resolveOperationsIcon } from '../../utils/operationsIcons';
import { OPERATIONS_CATEGORY_LABELS } from '../../utils/operationsCategories';
import { formatOperationsPrice, isComplianceService } from '../../utils/operationsPricing';
import LikeButton from '../common/LikeButton';
import cobrotherViewMark from '../../assets/Cobrother_Profile.png';
import { useIsCarouselClone } from './HomeAutoScrollRow';
import TruncatedItemsTooltip from '../common/TruncatedItemsTooltip';

function resolveSkills(service) {
  if (Array.isArray(service.skills)) return service.skills;
  if (typeof service.skills === 'string' && service.skills.trim()) {
    return service.skills.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(service.tags)) return service.tags;
  if (typeof service.tags === 'string' && service.tags.trim()) {
    return service.tags.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Homepage Operations preview card (Virtual Assistance / Compliance).
 *
 * A service-version of the CoBrother "Creators" card. It reuses the Creator
 * card's own classes for the views icon (brand mark), badges, footer, divider
 * and skills icon so the footer/badges look identical to the Creators section,
 * while keeping the Home-only service layout (avatar, verified mark, price box,
 * Hire CTA). The hover effect reuses the shared Creator-card hover via the shell.
 *
 * Home page only — does NOT touch the Operations page or shared components.
 * Functionality is unchanged: same Operations API data, same Hire popup.
 */
export default function HomeOperationsPreviewCard({ service, onHire }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const isCarouselClone = useIsCarouselClone();

  const Icon = resolveOperationsIcon(service);
  const catLabel = OPERATIONS_CATEGORY_LABELS[service.category] ?? service.category;
  const cardCompliance = isComplianceService(service);
  const priceInfo = formatOperationsPrice(service, { t, formatPrice });
  const skills = resolveSkills(service);

  const imageUrl = service.imageUrl || service.image_url || null;
  const views = Number(service.views ?? service.view_count ?? 0);

  // Display-only wording for the homepage Hub Registrars cards: "Registration" → "Register"
  // in the visible title. Backend/API identifiers (e.g. GST_REGISTRATION) stay untouched.
  const displayName = (service.name || '').replace(/\bRegistration\b/g, 'Register');

  const [liked, setLiked] = useState(Boolean(service.liked));
  const [likeCount, setLikeCount] = useState(Number(service.likeCount ?? service.likes ?? 0));
  const handleLike = () => {
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => (next ? c + 1 : c - 1));
      return next;
    });
  };

  const priceLabel = cardCompliance
    ? t('operationsPriceLabel', { defaultValue: 'PRICE' })
    : t('operationsFrom', { defaultValue: 'STARTING AT' });

  return (
    <article className="home-operations-preview-card">
      <div className="home-operations-preview-card__top">
        <div className="home-operations-preview-card__avatar-wrap">
          {imageUrl && !isCarouselClone ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="home-operations-preview-card__avatar"
              width={54}
              height={54}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="home-operations-preview-card__avatar home-operations-preview-card__avatar--fallback"
              aria-hidden
            >
              <Icon size={20} strokeWidth={2} />
            </div>
          )}
        </div>

        {catLabel ? (
          <span className="creator-profile-card__badge home-operations-preview-card__category-badge">{catLabel}</span>
        ) : null}
      </div>

      <h3 className="home-operations-preview-card__title">{displayName}</h3>

      <p className="home-operations-preview-card__desc">
        {service.description ||
          t('operationsCardDesc', {
            defaultValue:
              'Dedicated remote professional for your MSME — flexible monthly engagement.',
          })}
      </p>

      {skills.length > 0 && (
        <div className="home-operations-preview-card__skills">
          <div className="desc-icon-wrapper flex-shrink-0 w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
            <Lightbulb size={16} strokeWidth={2} className="text-[#0284C7]" aria-hidden />
          </div>
          <div className="home-operations-preview-card__skill-pills">
            {skills.slice(0, 3).map((skill, i) => (
              <span key={i} className="creator-profile-card__badge">
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <TruncatedItemsTooltip items={skills.slice(3)}>
                <span className="creator-profile-card__badge cursor-pointer">+{skills.length - 3}</span>
              </TruncatedItemsTooltip>
            )}
          </div>
        </div>
      )}

      <div className="home-operations-preview-card__price-box">
        <div className="home-operations-preview-card__price-text">
          <span className="home-operations-preview-card__price-label">
            {priceLabel}
          </span>
          <span className="home-operations-preview-card__price-amount">
            {priceInfo.showPrice ? (
              <>
                {priceInfo.amount}
                {priceInfo.suffix && (
                  <span className="home-operations-preview-card__price-suffix">
                    {priceInfo.suffix}
                  </span>
                )}
              </>
            ) : (
              <span className="home-operations-preview-card__price-amount--muted">
                {cardCompliance
                  ? t('operationsContact', { defaultValue: 'Contact' })
                  : '—'}
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          className="home-operations-preview-card__cta"
          onClick={() => onHire(service)}
          aria-label={cardCompliance
            ? t('operationsBookSlot', { defaultValue: 'Book Your Slot' })
            : t('operationsHire', { defaultValue: 'Hire' })}
        >
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      <hr className="creator-profile-card__divider" />
      <div className="creator-profile-card__footer">
        <div className="creator-profile-card__views" title={t('operationsViews', { defaultValue: 'Views' })}>
          <img src={cobrotherViewMark} alt="" aria-hidden className="creator-profile-card__brand-mark" />
          <span>{views}</span>
        </div>
        <LikeButton liked={liked} count={likeCount} onToggle={handleLike} />
      </div>
    </article>
  );
}
