import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EditActionLabel from '../components/common/EditActionLabel';
import CoVentureModal from '../components/venture/CoVentureModal';
import VentureBidModal from '../components/venture/VentureBidModal';
import VentureCompanyProfileSummary from '../components/venture/VentureCompanyProfileSummary';
import VentureListingTypeBadge from '../components/listings/VentureListingTypeBadge';
import { coVentureAPI, ventureAPI, ventureDealAPI, venturePitchAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatEquityOfferedPct } from '../constants/ventureLabels';
import { unwrapApiData } from '../utils/apiResponse';
import { canViewListingDetail, isListingOwner } from '../utils/listingVisibility';
import { resolveVenturePublicContact } from '../utils/ventureProfileUtils';
import {
  isCoVentureListing,
  isFullAcquisitionListing,
  isVentureGstinVerified,
  resolveSellerAskSummary,
  resolveVentureInterestCount,
  formatVentureAskingPrice,
} from '../utils/ventureListingHelpers';
import { asArray } from '../utils/asArray';
import verifiedIcon from '../assets/Verified_Icon.png';

function DetailSection({ title, children }) {
  return (
    <section className="rounded-[18px] border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-gray-900 m-0 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-900 break-words">{value}</div>
    </div>
  );
}

export default function VentureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { formatPrice } = useCurrency();

  const [venture, setVenture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [activeDealId, setActiveDealId] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const STAGE_LABELS = {
    IDEA: t('venturesPageStageIdea'),
    MVP: t('venturesPageStageMvp'),
    REVENUE_GENERATING: t('venturesPageStageRevenue'),
    SCALING: t('venturesPageStageScaling'),
  };

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    setLoading(true);
    setAccessDenied(false);
    setLoadError(false);

    ventureAPI.get(id)
      .then((response) => {
        if (cancelled) return;
        const row = unwrapApiData(response) ?? unwrapApiData(response?.data) ?? response?.data;
        if (!row?.id) {
          setLoadError(true);
          setVenture(null);
          return;
        }
        if (!canViewListingDetail(row, user, 'venture')) {
          setAccessDenied(true);
          setVenture(null);
          return;
        }
        setVenture(row);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404 || status === 403) {
          setAccessDenied(true);
        } else {
          setLoadError(true);
        }
        setVenture(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, user, navigate, authLoading]);

  useEffect(() => {
    if (!venture?.id || authLoading) return;

    Promise.all([
      venturePitchAPI.getMy().catch(() => ({ data: [] })),
      coVentureAPI.getMyApplications().catch(() => ({ data: [] })),
      ventureDealAPI.getMy().catch(() => ({ data: [] })),
    ]).then(([pitchRes, coRes, dealRes]) => {
      const ventureId = venture.id;
      let applied = false;

      asArray(pitchRes.data)
        .filter((p) => ['PENDING', 'SHORTLISTED', 'SELLER_ACCEPTED', 'DEAL_SELECTED'].includes(p.status))
        .forEach((p) => {
          if (p.ventureId === ventureId) applied = true;
        });

      asArray(coRes.data)
        .filter((a) => a.status === 'PENDING' || a.status === 'APPROVED')
        .forEach((a) => {
          const vid = a.ventureId || a.venture?.id;
          if (vid === ventureId) applied = true;
        });

      setHasApplied(applied);

      const deals = asArray(unwrapApiData(dealRes.data) ?? dealRes.data);
      const deal = deals.find((d) => {
        if (d.ventureId !== ventureId) return false;
        return ['PENDING_ADMIN_APPROVAL', 'PENDING_PAYMENT', 'PAYMENT_HELD', 'IN_PROGRESS', 'COMPLETED'].includes(d.dealStatus);
      });
      setActiveDealId(deal?.id ?? null);
    });
  }, [venture?.id, authLoading]);

  const handleDelete = async () => {
    try {
      await ventureAPI.delete(id);
      navigate('/ventures');
    } catch (err) {
      alert(err.response?.data?.error || t('venturesPageDeleteFailed'));
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleBuyerAction = () => {
    if (activeDealId) {
      navigate(`/ventures/deals/${activeDealId}`);
      return;
    }
    setApplyOpen(true);
  };

  if (loading || authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (accessDenied || loadError || !venture) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-16 text-center">
          <p className={`${loadError ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-amber-700 bg-amber-50 border-amber-200'} border rounded-lg px-4 py-3 inline-block`}>
            {loadError
              ? t('ventureDetailLoadFailed', 'Unable to load this venture right now.')
              : t('listingDetailAccessDenied', 'This listing is not available to view yet.')}
          </p>
          <div className="mt-6">
            <Link to="/ventures" className="btn-glow btn-glow-sm inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              {t('ventureDetailBackToBrowse', 'Back to ventures')}
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const b = venture.brandDetails || {};
  const brandName = b.brandName || t('listingCardUnnamedVenture', 'Unnamed venture');
  const isOwner = isListingOwner(venture, user, 'venture');
  const isCoVenture = isCoVentureListing(venture);
  const isFullAcquisition = isFullAcquisitionListing(venture);
  const isGstinVerified = isVentureGstinVerified(venture);
  const sellerAsk = resolveSellerAskSummary(venture);
  const publicContact = resolveVenturePublicContact(venture, isOwner);
  const companyProfile = venture.companyProfile || venture.company_profile;
  const interestCount = resolveVentureInterestCount(venture);
  const interestLabel = isCoVenture ? t('ventureDetailApplications', 'applications') : t('ventureDetailBids', 'bids');
  const equityPctLabel = formatEquityOfferedPct(
    venture.equityPercentOffered ?? venture.equity_percent_offered,
  );
  const isListingApproved = (venture.listingApprovalStatus ?? venture.listing_approval_status) === 'APPROVED';
  const canSubmit = isListingApproved && !activeDealId;
  const ctaLabel = isCoVenture
    ? t('listingCardApply', 'Apply')
    : (isFullAcquisition ? t('listingCardOffer', 'Offer') : t('listingCardPitch', 'Pitch'));

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto pb-24 sm:pb-8">
        <Link
          to="/ventures"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-5 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('ventureDetailBackToBrowse', 'Back to ventures')}
        </Link>

        <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-5 border-b border-gray-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-6">
            <div className="relative mx-auto aspect-square w-28 overflow-hidden rounded-[22px] border border-gray-200 bg-slate-100 shadow-sm sm:w-32 lg:mx-0 lg:w-36">
              {b.ventureImageUrl ? (
                <img
                  src={b.ventureImageUrl}
                  alt={brandName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-3 text-center">
                  <span className="text-lg font-semibold text-slate-400 break-words leading-tight">
                    {brandName}
                  </span>
                </div>
              )}
              {isGstinVerified ? (
                <img
                  src={verifiedIcon}
                  alt=""
                  className="absolute right-2 top-2 h-10 w-10 object-contain drop-shadow-md"
                  aria-hidden
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <VentureListingTypeBadge venture={venture} />
                {b.industry && (
                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                    {b.industry.replace(/_/g, ' ')}
                  </span>
                )}
                {equityPctLabel && isCoVenture && (
                  <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 text-xs font-semibold rounded-full">
                    {equityPctLabel} {t('ventureDetailEquityOffered', 'equity offered')}
                  </span>
                )}
              </div>

              <h1 className="mt-2 font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-950 m-0 break-words">
                {brandName}
              </h1>

              {b.description && (
                <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-gray-600 m-0">
                  {b.description}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0">
            <div className="lg:col-span-2 p-5 sm:p-8 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-gray-100">
              {(sellerAsk.price || sellerAsk.equityLabel) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sellerAsk.price ? (
                    <div className="rounded-[16px] border border-sky-100 bg-sky-50 px-4 py-4">
                      <div className="text-[0.68rem] font-bold uppercase tracking-wide text-sky-700">
                        {t('ventureDetailAskingPrice', 'Asking price')}
                      </div>
                      <div className="text-2xl font-bold text-sky-900 mt-1">
                        {formatVentureAskingPrice(sellerAsk.price, formatPrice)}
                      </div>
                    </div>
                  ) : null}
                  {sellerAsk.equityLabel ? (
                    <div className="rounded-[16px] border border-purple-100 bg-purple-50 px-4 py-4">
                      <div className="text-[0.68rem] font-bold uppercase tracking-wide text-purple-700">
                        {t('ventureDetailEquityOffered', 'Equity offered')}
                      </div>
                      <div className="text-2xl font-bold text-purple-900 mt-1">{sellerAsk.equityLabel}</div>
                      {sellerAsk.dealTypeLabel ? (
                        <div className="text-sm text-purple-700 mt-1">{sellerAsk.dealTypeLabel}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {t('venturesPageViewsLabel', { count: venture.views || 0 })}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800">
                  {interestCount} {interestLabel}
                </span>
                {venture.stage && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {STAGE_LABELS[venture.stage] || venture.stage}
                  </span>
                )}
              </div>

              {venture.lookingFor && (
                <DetailSection title={t('venturesPageLookingForSection')}>
                  <p className="text-gray-700 leading-relaxed text-sm m-0">{venture.lookingFor}</p>
                </DetailSection>
              )}

              {venture.currentProblem && (
                <DetailSection title={t('venturesPageChallengeSection')}>
                  <p className="text-gray-700 leading-relaxed text-sm m-0">{venture.currentProblem}</p>
                </DetailSection>
              )}

              {companyProfile && (
                <DetailSection title={t('ventureDetailCompanyProfile', 'Company profile')}>
                  <VentureCompanyProfileSummary profile={companyProfile} formatPrice={formatPrice} />
                </DetailSection>
              )}
            </div>

            <aside className="p-5 sm:p-8 flex flex-col gap-5 bg-gray-50/70">
              {(publicContact.email || publicContact.phone || publicContact.contactPerson) && (
                <DetailSection title={t('venturesPageContactSection')}>
                  <div className="grid grid-cols-1 gap-4">
                    <DetailField label={t('ventureDetailContactPerson', 'Contact person')} value={publicContact.contactPerson} />
                    <DetailField label={t('emailLabel')} value={publicContact.email} />
                    <DetailField label={t('domainsPagePhoneLabel')} value={publicContact.phone} />
                  </div>
                </DetailSection>
              )}

              {(b.website || b.videoUrl) && (
                <DetailSection title={t('venturesPageLinksSection')}>
                  <div className="flex flex-col gap-2">
                    {b.website && (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {t('venturesPageWebsiteLink')}
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {b.videoUrl && (
                      <a
                        href={b.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {t('venturesPageVideoLink')}
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </DetailSection>
              )}

              {venture.listedBy && (
                <DetailSection title={t('venturesPageListedBySection')}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600 text-sm">
                      {venture.listedBy.firstname?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">
                        {venture.listedBy.firstname} {venture.listedBy.lastname}
                      </div>
                      <div className="text-xs text-gray-600 break-all">{venture.listedBy.email}</div>
                    </div>
                  </div>
                </DetailSection>
              )}
            </aside>
          </div>

          <div className="border-t border-gray-100 px-5 sm:px-8 py-4 bg-white flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            {isOwner ? (
              <>
                <button
                  type="button"
                  className="btn-glow btn-glow-sm w-full sm:w-auto inline-flex items-center justify-center"
                  onClick={() => navigate(`/ventures/${venture.id}/edit`)}
                >
                  <EditActionLabel iconSize={16}>{t('edit')}</EditActionLabel>
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-500 border border-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600"
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('delete')}
                </button>
              </>
            ) : activeDealId ? (
              <button
                type="button"
                className="btn-glow btn-glow-sm w-full sm:w-auto"
                onClick={() => navigate(`/ventures/deals/${activeDealId}`)}
              >
                {t('ventureDetailContinuePurchase', 'Continue purchase')}
              </button>
            ) : (
              <button
                type="button"
                className={
                  hasApplied
                    ? 'w-full sm:w-auto px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-sm font-semibold cursor-not-allowed'
                    : canSubmit
                      ? 'btn-glow btn-glow-sm w-full sm:w-auto'
                      : 'w-full sm:w-auto px-5 py-2.5 bg-gray-100 border border-gray-200 text-gray-400 rounded-full text-sm font-semibold cursor-not-allowed'
                }
                onClick={canSubmit && !hasApplied ? handleBuyerAction : undefined}
                disabled={!canSubmit || hasApplied}
              >
                {hasApplied
                  ? (isCoVenture ? t('listingCardApplied', 'Applied') : t('listingCardPitched', 'Submitted'))
                  : (isCoVenture ? t('ventureDetailApplyPartner', 'Apply as Partner') : `${ctaLabel} →`)}
              </button>
            )}
          </div>
        </div>
      </div>

      {applyOpen && isCoVentureListing(venture) && (
        <CoVentureModal
          venture={venture}
          onClose={() => setApplyOpen(false)}
          onApplied={() => {
            setHasApplied(true);
            setApplyOpen(false);
          }}
        />
      )}

      {applyOpen && !isCoVentureListing(venture) && (
        <VentureBidModal
          venture={venture}
          onClose={() => setApplyOpen(false)}
          onSubmitted={() => {
            setHasApplied(true);
            setApplyOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={t('venturesPageDeleteTitle', 'Delete venture?')}
        message={t('venturesPageDeleteMessage', 'This cannot be undone.')}
        confirmLabel={t('delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </AppLayout>
  );
}
