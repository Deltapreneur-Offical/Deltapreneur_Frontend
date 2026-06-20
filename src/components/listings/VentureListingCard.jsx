import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { ArrowRight, Share2, Trash2, Rocket, Handshake, Briefcase, Users } from 'lucide-react';

import { EditIcon } from '../common/EditActionLabel';

import { useCurrency } from '../../context/CurrencyContext';

import { APP_BASE_URL } from '../../config/urls';

import ListingCardStatsFooter from './ListingCardStatsFooter';

import verifiedIcon from '../../assets/Verified_Icon.png';

import {

  isCoVentureListing,

  isFullAcquisitionListing,

  isVentureGstinVerified,

  resolveVentureApprovalStatus,

  resolveSellerAskSummary,

  resolveCoVentureInvestmentSeeking,

  formatCoVentureInvestmentDisplay,

  formatVentureAskingPrice,

  resolveVentureInterestCount,

} from '../../utils/ventureListingHelpers';

import '../../styles/domain-listing-cards.css';



const PRIMARY_BTN =

  'domain-listing-card__cta-btn w-full rounded-full px-4 py-2.5 text-[0.8125rem] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200';



function VentureCardArrowCta({ label, onClick, disabled = false, className = '', isCoVenture = false }) {
  const themeClass = isCoVenture
    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-100 focus-visible:ring-emerald-200'
    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-100 focus-visible:ring-indigo-200';

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${PRIMARY_BTN} inline-flex items-center justify-center text-white ${themeClass}${disabled ? ' cursor-not-allowed bg-slate-100 text-slate-400 hover:bg-slate-100 shadow-none' : ''}${className ? ` ${className}` : ''}`}
      aria-label={label}
      onClick={onClick}
    >
      <span className="mr-2 font-semibold text-xs tracking-wide uppercase">{label}</span>
      <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
    </button>
  );
}



function resolveVentureStatusDotClass(venture) {

  if (venture?.status === false) return 'listing-availability-badge__dot--muted';

  return 'listing-availability-badge__dot--available';

}



export default function VentureListingCard({

  venture,

  isOwner,

  hasApplied = false,

  hasActiveDeal = false,

  showVerifyButton = true,

  browseMode = false,

  compact = false,

  onView,

  onApply,

  onVerify,

  onEdit,

  onDelete,

  likeState,

  onLike,

}) {

  const { t } = useTranslation();

  const { formatPrice } = useCurrency();

  const navigate = useNavigate();

  const [shareOpen, setShareOpen] = useState(false);

  const [imgFailed, setImgFailed] = useState(false);

  const shareRef = useRef(null);



  const b = venture.brandDetails || {};

  const brandName = b.brandName || t('listingCardUnnamedVenture', 'Unnamed venture');

  const isCoVenture = isCoVentureListing(venture);

  const isFullAcquisition = isFullAcquisitionListing(venture);

  const approvalStatus = resolveVentureApprovalStatus(venture);

  const isListingApproved = approvalStatus === 'approved';

  const isGstinVerified = isVentureGstinVerified(venture);

  const canInteract = !isOwner && isListingApproved && !hasApplied && !hasActiveDeal;

  const ctaLabel = isCoVenture

    ? t('listingCardApply', 'Apply')

    : (isFullAcquisition ? t('listingCardOffer', 'Offer') : t('listingCardPitch', 'Pitch'));

  const sellerAsk = resolveSellerAskSummary(venture);

  const ventureImage = b.ventureImageUrl && !imgFailed ? b.ventureImageUrl : null;

  const coVentureInvestment = isCoVenture ? resolveCoVentureInvestmentSeeking(venture) : null;

  const interestCount = resolveVentureInterestCount(venture);

  const roleOffer = isCoVenture
    ? (venture.roles?.[0]?.title || venture.roles?.[0]?.roleOffer || venture.roles?.[0]?.role_offer)
    : null;



  const priceAmount = isCoVenture && coVentureInvestment != null
    ? coVentureInvestment
    : Number(sellerAsk.price ?? 0);



  const priceDisplay = isCoVenture && coVentureInvestment != null

    ? formatCoVentureInvestmentDisplay(coVentureInvestment, formatPrice)

    : (Number(priceAmount) > 0 ? formatVentureAskingPrice(priceAmount, formatPrice) : '');



  const showPriceText = Boolean(priceDisplay);



  useEffect(() => {

    setImgFailed(false);

  }, [b.ventureImageUrl, venture.id]);



  useEffect(() => {

    const handleClick = (e) => {

      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);

    };

    document.addEventListener('mousedown', handleClick);

    return () => document.removeEventListener('mousedown', handleClick);

  }, []);



  const shareUrl =

    typeof window !== 'undefined'

      ? `${window.location.origin}/ventures/${venture.id}`

      : `${APP_BASE_URL.replace(/\/$/, '')}/ventures/${venture.id}`;

  const shareText = t('listingCardShareVenture', {

    name: brandName,

    defaultValue: `Check out this venture: ${brandName} - Listed on CoBrother!`,

  });

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;



  const handleShare = (platform) => {

    window.open(platform, '_blank', 'width=600,height=400');

    setShareOpen(false);

  };



  const stop = (e) => e.stopPropagation();

  const interactive = Boolean(onView);



  const handleViewDetails = onView

    ? (e) => {

      stop(e);

      onView();

    }

    : undefined;



  const shareButton = (

    <div className="relative shrink-0" ref={shareRef}>

      <button

        type="button"

        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-600 hover:bg-slate-100"

        onClick={(e) => {

          stop(e);

          setShareOpen(!shareOpen);

        }}

        title={t('listingCardShare')}

      >

        <Share2 size={12} />

      </button>

      {shareOpen && (

        <div

          className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[150px] text-gray-900"

          onClick={stop}

        >

          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">

            <span className="text-[10px] font-semibold text-gray-600">Share via</span>

          </div>

          <button

            type="button"

            className="w-full px-3 py-2 text-left text-xs font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"

            onClick={() => handleShare(linkedinShare)}

          >

            {t('listingCardLinkedIn')}

          </button>

          <button

            type="button"

            className="w-full px-3 py-2 text-left text-xs font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors"

            onClick={() => handleShare(facebookShare)}

          >

            {t('listingCardFacebook')}

          </button>

          <button

            type="button"

            className="w-full px-3 py-2 text-left text-xs font-medium text-gray-800 hover:bg-green-50 hover:text-green-700 transition-colors"

            onClick={() => handleShare(whatsappShare)}

          >

            {t('listingCardWhatsApp')}

          </button>

        </div>

      )}

    </div>

  );



  const renderPrimaryAction = () => {

    if (browseMode) return null;



    if (isOwner) {

      return (

        <div className="flex w-full items-center gap-2" onClick={stop} onMouseDown={stop} role="presentation">

          <div className="flex min-w-0 flex-1 gap-2">

            {showVerifyButton && !isGstinVerified && (

              <button

                type="button"

                className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"

                onClick={(e) => {

                  stop(e);

                  onVerify?.();

                }}

              >

                {t('listingCardVerifyGstin', 'Verify GSTIN')}

              </button>

            )}

            <button

              type="button"

              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center gap-1"

              onClick={(e) => {

                stop(e);

                onEdit?.();

              }}

            >

              <EditIcon size={14} /> {t('edit')}

            </button>

            <button

              type="button"

              className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 inline-flex items-center justify-center gap-1"

              onClick={(e) => {

                stop(e);

                onDelete?.();

              }}

            >

              <Trash2 size={12} /> {t('remove')}

            </button>

          </div>

          {shareButton}

        </div>

      );

    }



    if (canInteract) {
      return (
        <VentureCardArrowCta
          label={ctaLabel}
          onClick={(e) => {
            stop(e);
            onApply?.();
          }}
          isCoVenture={isCoVenture}
        />
      );
    }

    if (hasActiveDeal) {
      return (
        <VentureCardArrowCta
          label={t('listingCardContinue', 'Continue')}
          onClick={(e) => {
            stop(e);
            onApply?.();
          }}
          isCoVenture={isCoVenture}
        />
      );
    }

    if (hasApplied) {
      return (
        <button
          type="button"
          disabled
          className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}
          title={isCoVenture ? t('listingCardAlreadyApplied', 'You already applied') : t('listingCardAlreadyPitched', 'You already pitched')}
        >
          {isCoVenture ? t('listingCardApplied', 'Applied') : t('listingCardPitched', 'Pitched')}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled
        className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}
        title={!isListingApproved ? t('listingCardPendingApproval', 'Listing pending admin approval') : undefined}
      >
        {!isListingApproved ? t('listingCardPendingApproval', 'Pending Approval') : t('listingCardUnavailable', 'Unavailable')}
      </button>
    );
  };



  const cardLayoutClass = browseMode
    ? 'h-auto min-h-0'
    : 'h-full min-h-0';



  const showPriceBox = showPriceText || handleViewDetails;
  const isHomePreview = compact && browseMode;



  return (

    <article

      className={`domain-listing-card venture-listing-card card-glow-hover relative flex ${cardLayoutClass} w-full flex-col overflow-hidden rounded-3xl bg-white ${
        isCoVenture 
          ? 'venture-listing-card--coventure' 
          : 'venture-listing-card--venture'
      } ${compact ? 'venture-listing-card--compact' : ''}${compact && browseMode ? ' venture-listing-card--home-preview' : ''} ${browseMode ? 'domain-listing-card--browse' : ''} ${interactive ? 'cursor-pointer' : ''}`}

      onClick={interactive ? onView : undefined}

      role={interactive ? 'button' : undefined}

      tabIndex={interactive ? 0 : undefined}

      onKeyDown={interactive ? (e) => { if (e.key === 'Enter') onView?.(); } : undefined}

    >

      <div className="domain-listing-card__cover">

        {ventureImage ? (

          <img

            src={ventureImage}

            alt={brandName}

            className="domain-listing-card__cover-img"

            onError={() => setImgFailed(true)}

          />

        ) : (

          <div 

            className={`relative flex flex-col items-center justify-center w-full h-full text-center overflow-hidden ${
              compact ? 'p-2' : 'p-4'
            } ${

              isCoVenture 

                ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700' 

                : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800'

            }`}

            aria-hidden

          >

            {/* Subtle background icon watermark */}

            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none transform scale-150">

              {isCoVenture ? (

                <Handshake size={compact ? 80 : 120} strokeWidth={1.5} className="text-white" />

              ) : (

                <Rocket size={compact ? 80 : 120} strokeWidth={1.5} className="text-white" />

              )}

            </div>

            

            {/* Brand Name Text */}

            <span className={`relative z-10 venture-listing-card__cover-title truncate max-w-full px-2 ${
              compact ? 'venture-listing-card__cover-title--compact' : ''
            }`}>

              {brandName}

            </span>

            

            {/* Subtle badge on cover */}

            <span className={`relative z-10 mt-1 venture-listing-card__cover-badge uppercase ${
              compact ? 'venture-listing-card__cover-badge--compact' : ''
            }`}>

              {isCoVenture ? 'Co-Venture' : 'Venture'}

            </span>

          </div>

        )}

        {isGstinVerified ? (

          <img

            src={verifiedIcon}

            alt=""

            className="domain-listing-card__verified-icon"

            title={t('listingCardGstVerified', 'GST verified')}

            aria-hidden

          />

        ) : null}

      </div>



      <div className={`domain-listing-card__body flex flex-col flex-1 ${
        compact && browseMode
          ? 'gap-2 p-3'
          : compact
            ? 'justify-between gap-2 p-3'
            : 'justify-between gap-3 p-4'
      }`}>

        <div className="flex flex-col gap-2">

          {/* Industry & Deal Type Badges */}

          <div className="venture-listing-card__badges flex flex-wrap gap-1">

            {b.industry && (

              <span className={`venture-listing-card__badge px-2 py-0.5 rounded-full ${
                compact ? 'venture-listing-card__badge--compact' : ''
              } ${

                isCoVenture 

                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 

                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'

              }`}>

                {b.industry}

              </span>

            )}

            {sellerAsk.dealTypeLabel && (

              <span className={`venture-listing-card__badge px-2 py-0.5 rounded-full ${
                compact ? 'venture-listing-card__badge--compact' : ''
              } ${

                isCoVenture 

                  ? 'bg-teal-50 text-teal-700 border border-teal-100' 

                  : 'bg-purple-50 text-purple-700 border border-purple-100'

              }`}>

                {sellerAsk.dealTypeLabel}

              </span>

            )}

          </div>



          {/* Brand Name & Status Dot */}

          <div className="venture-listing-card__title-row flex items-center justify-between gap-2">

            <h3 className={`venture-listing-card__title truncate ${
              compact ? 'venture-listing-card__title--compact' : ''
            }`} title={brandName}>

              {brandName}

            </h3>

            <span

              className={`w-2 h-2 rounded-full shrink-0 ${

                venture.status === false ? 'bg-slate-300' : 'bg-emerald-500'

              }`}

              title={venture.status === false ? 'INACTIVE' : 'AVAILABLE'}

            />

          </div>



          {/* Description - only show if not compact */}

          {!compact && b.description && (

            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed m-0">

              {b.description}

            </p>

          )}



          {/* Key Metrics / Details Grid */}

          {compact ? (
            <div className="venture-listing-card__metrics flex flex-nowrap items-center justify-between gap-x-2 mt-1 min-w-0 w-full">
              {sellerAsk.equityLabel ? (
                <div className="venture-listing-card__metric flex items-center gap-1 min-w-0 shrink">
                  <span className="truncate">{sellerAsk.equityLabel} Equity</span>
                </div>
              ) : (
                <span className="venture-listing-card__metric shrink-0" aria-hidden>
                  {'\u00A0'}
                </span>
              )}

              <div className="venture-listing-card__metric flex items-center gap-1 shrink-0">
                <Users size={11} className={interestCount > 0 ? (isCoVenture ? 'text-emerald-500' : 'text-indigo-500') : 'text-slate-400'} />
                <span className="truncate">{interestCount > 0 ? `${interestCount} ${isCoVenture ? 'Applicants' : 'Pitches'}` : `No ${isCoVenture ? 'applicants' : 'pitches'}`}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mt-1">
              {/* Equity Offered */}
              {sellerAsk.equityLabel && (
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
                  isCoVenture 
                    ? 'bg-emerald-50/30 border-emerald-100/50 text-emerald-800' 
                    : 'bg-indigo-50/30 border-indigo-100/50 text-indigo-800'
                }`}>
                  <span className="text-[11px] font-medium truncate">
                    {sellerAsk.equityLabel} Equity
                  </span>
                </div>
              )}

              {/* Role Offered (for Co-Venture) */}
              {isCoVenture && roleOffer ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border bg-teal-50/30 border-teal-100/50 text-teal-800">
                  <Briefcase size={12} className="text-teal-500" />
                  <span className="text-[11px] font-medium truncate" title={roleOffer}>
                    {roleOffer}
                  </span>
                </div>
              ) : null}

              {/* Interest/Pitches Count */}
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
                interestCount > 0
                  ? (isCoVenture 
                    ? 'bg-emerald-50/30 border-emerald-100/50 text-emerald-800' 
                    : 'bg-indigo-50/30 border-indigo-100/50 text-indigo-800')
                  : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <Users size={12} className={interestCount > 0 ? (isCoVenture ? 'text-emerald-500' : 'text-indigo-500') : 'text-slate-400'} />
                <span className="text-[11px] font-medium truncate">
                  {interestCount > 0 
                    ? `${interestCount} ${isCoVenture ? 'Applicants' : 'Pitches'}`
                    : `No ${isCoVenture ? 'applicants' : 'pitches'}`
                  }
                </span>
              </div>
            </div>
          )}

        </div>



        <div className={`venture-listing-card__footer flex flex-col ${compact ? 'gap-2 mt-auto' : 'gap-3 mt-2'}`}>

          {/* Price Box */}

          {showPriceBox && (

            <div 

              className={`domain-listing-card__price-box ${
                isCoVenture 
                  ? 'domain-listing-card__price-box--coventure' 
                  : 'domain-listing-card__price-box--venture'
              } ${compact ? 'domain-listing-card__price-box--compact' : ''}`}

              style={isHomePreview ? undefined : {
                borderRadius: compact ? '0.75rem' : '1rem',
                background: 'linear-gradient(#ffffff, #ffffff) padding-box, ' + (
                  isCoVenture
                    ? 'linear-gradient(90deg, #34d399 0%, #10b981 50%, #059669 100%) border-box'
                    : 'linear-gradient(90deg, #a78bfa 0%, #818cf8 50%, #4f46e5 100%) border-box'
                ),
                boxShadow: isCoVenture
                  ? '-8px 0 16px -8px rgba(16, 185, 129, 0.22), 8px 0 16px -8px rgba(5, 150, 105, 0.18), 0 0 10px -4px rgba(16, 185, 129, 0.18)'
                  : '-8px 0 16px -8px rgba(129, 140, 248, 0.22), 8px 0 16px -8px rgba(79, 70, 229, 0.18), 0 0 10px -4px rgba(139, 92, 246, 0.18)',
              }}

            >

              {showPriceText ? (

                <div className="domain-listing-card__price-text min-w-0 flex flex-col">

                  <span className="venture-listing-card__price-label uppercase leading-none">

                    {isHomePreview
                      ? (isCoVenture ? t('listingCardInvestment', 'Investment') : t('listingCardAskingPrice', 'Asking Price'))
                      : (sellerAsk.dealTypeLabel || (isCoVenture ? 'Investment' : 'Asking Price'))}

                  </span>

                  <span className={`domain-listing-card__price-value currency-display truncate ${
                    compact ? 'venture-listing-card__price-value--compact' : ''
                  }`}>

                    {priceDisplay}

                  </span>

                </div>

              ) : null}



              {handleViewDetails ? (

                <button

                  type="button"

                  className={`domain-listing-card__price-cta flex items-center justify-center transition-all ${
                    compact ? 'w-6 h-6' : ''
                  } ${

                    isCoVenture 

                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 

                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'

                  }`}

                  aria-label={t('listingCardViewDetails', 'View details')}

                  onClick={handleViewDetails}

                >

                  <ArrowRight size={compact ? 12 : 14} strokeWidth={2.25} aria-hidden />

                </button>

              ) : null}

            </div>

          )}



          {/* Stats Footer */}

          <ListingCardStatsFooter

            viewCount={venture.views || 0}

            likeState={likeState}

            onLike={onLike}

            likesFirst

            className="domain-listing-card__stats domain-listing-card__stats--split"

          />



          {/* Action Button */}

          {renderPrimaryAction() ? (

            <div className="domain-listing-card__actions">{renderPrimaryAction()}</div>

          ) : null}

        </div>

      </div>

    </article>

  );

}

