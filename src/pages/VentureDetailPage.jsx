import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, ExternalLink, DollarSign, PieChart, Eye, Users, 
  BarChart2, Target, AlertCircle, User, Mail, Phone, Briefcase, PlayCircle, MapPin
} from 'lucide-react';
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
import useReferralTracker from '../hooks/useReferralTracker';
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

function DetailSection({ title, children, icon: Icon, accentClass = "text-indigo-500" }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-7 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
        {Icon && <Icon className={`w-5 h-5 ${accentClass}`} />}
        <h2 className="font-display text-lg font-semibold text-gray-900 m-0">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DetailField({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      {Icon && (
        <div className="mt-0.5 flex-shrink-0">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">{label}</div>
        <div className="text-sm font-medium text-gray-900 break-words">{value}</div>
      </div>
    </div>
  );
}

export default function VentureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { formatPrice } = useCurrency();

  const handleBackToBrowse = (e) => {
    e.preventDefault();
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/ventures', { replace: true });
    }
  };

  useReferralTracker(id, 'venture');

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
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
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
            <button onClick={handleBackToBrowse} className="btn-glow btn-glow-sm inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              {t('ventureDetailBackToBrowse', 'Back to ventures')}
            </button>
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

  const accentColor = isCoVenture ? 'teal' : 'indigo';
  const themeClasses = {
    bgLight: isCoVenture ? 'bg-teal-50' : 'bg-indigo-50',
    bgLightFaint: isCoVenture ? 'bg-teal-50/50' : 'bg-indigo-50/50',
    bgBorder: isCoVenture ? 'border-teal-100' : 'border-indigo-100',
    textDark: isCoVenture ? 'text-teal-900' : 'text-indigo-900',
    textMain: isCoVenture ? 'text-teal-600' : 'text-indigo-600',
    textMainDark: isCoVenture ? 'text-teal-700' : 'text-indigo-700',
    gradient: isCoVenture ? 'from-teal-50/60 to-green-50/30' : 'from-indigo-50/60 to-blue-50/30',
    accentClass: isCoVenture ? 'text-teal-500' : 'text-indigo-500',
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto pb-24 sm:pb-12">
        <div className="px-4 sm:px-0 mb-6 mt-4">
          <button
            onClick={handleBackToBrowse}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            {t('ventureDetailBackToBrowse', 'Back to ventures')}
          </button>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/40 overflow-hidden">
          
          {/* Hero Section */}
          <div className={`relative p-6 sm:p-10 lg:p-12 border-b border-gray-100 bg-gradient-to-br ${themeClasses.gradient}`}>
            {/* Background subtle elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
            
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
              <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-[28px] border-4 border-white bg-white shadow-lg sm:w-40 lg:mx-0 lg:w-44 shrink-0">
                {b.ventureImageUrl ? (
                  <img
                    src={b.ventureImageUrl}
                    alt={brandName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center p-4 text-center ${themeClasses.bgLight}`}>
                    <span className={`text-xl font-bold ${themeClasses.textMainDark} break-words leading-tight opacity-70`}>
                      {brandName}
                    </span>
                  </div>
                )}
                {isGstinVerified ? (
                  <img
                    src={verifiedIcon}
                    alt="Verified"
                    className="absolute right-2 top-2 h-10 w-10 object-contain drop-shadow-md"
                    title="GSTIN Verified"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 text-center lg:text-left flex flex-col items-center lg:items-start">
                <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2.5 mb-4">
                  <VentureListingTypeBadge venture={venture} />
                  {b.industry && (
                    <span className="px-3 py-1 bg-white/60 text-gray-800 text-[0.7rem] uppercase tracking-wider font-bold rounded-full border border-gray-200/50 shadow-sm">
                      {b.industry.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-950 m-0 tracking-tight break-words mb-4">
                  {brandName}
                </h1>

                {b.description && (
                  <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-gray-700 m-0 font-medium">
                    {b.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-0 relative">
            <div className="lg:col-span-8 p-6 sm:p-10 flex flex-col gap-8 border-b lg:border-b-0 lg:border-r border-gray-100">
              
              {/* Metrics Row */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700 shadow-sm">
                  <span>{t('venturesPageViewsLabel', { count: venture.views || 0 })}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-sm font-medium text-amber-800 shadow-sm">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>{interestCount} {interestLabel}</span>
                </div>
                {venture.stage && (
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${themeClasses.bgLight} ${themeClasses.bgBorder} border text-sm font-medium ${themeClasses.textMainDark} shadow-sm`}>
                    <BarChart2 className={`w-4 h-4 ${themeClasses.textMain}`} />
                    <span>{STAGE_LABELS[venture.stage] || venture.stage}</span>
                  </div>
                )}
              </div>

              {/* Price & Equity Cards */}
              {(sellerAsk.price || sellerAsk.equityLabel) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {sellerAsk.price ? (
                    <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/50 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-24 h-24 text-sky-600" />
                      </div>
                      <div className="relative">
                        <div className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-widest text-sky-600 mb-2">
                          <DollarSign className="w-4 h-4" />
                          {t('ventureDetailAskingPrice', 'Asking price')}
                        </div>
                        <div className="text-3xl sm:text-4xl font-extrabold text-sky-950 tracking-tight">
                          {formatVentureAskingPrice(sellerAsk.price, formatPrice)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  
                  {sellerAsk.equityLabel ? (
                    <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <PieChart className="w-24 h-24 text-purple-600" />
                      </div>
                      <div className="relative">
                        <div className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-widest text-purple-600 mb-2">
                          <PieChart className="w-4 h-4" />
                          {t('ventureDetailEquityOffered', 'Equity offered')}
                        </div>
                        <div className="text-3xl sm:text-4xl font-extrabold text-purple-950 tracking-tight mb-1">
                          {sellerAsk.equityLabel}
                        </div>
                        {sellerAsk.dealTypeLabel ? (
                          <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-semibold">
                            {sellerAsk.dealTypeLabel}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Content Sections */}
              {venture.lookingFor && (
                <DetailSection title={t('venturesPageLookingForSection')} icon={Target} accentClass={themeClasses.accentClass}>
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base m-0 whitespace-pre-line">{venture.lookingFor}</p>
                </DetailSection>
              )}

              {venture.currentProblem && (
                <DetailSection title={t('venturesPageChallengeSection')} icon={AlertCircle} accentClass="text-amber-500">
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base m-0 whitespace-pre-line">{venture.currentProblem}</p>
                </DetailSection>
              )}

              {companyProfile && (
                <DetailSection title={t('ventureDetailCompanyProfile', 'Company profile')} icon={Briefcase} accentClass={themeClasses.accentClass}>
                  <VentureCompanyProfileSummary profile={companyProfile} formatPrice={formatPrice} />
                </DetailSection>
              )}
            </div>

            <aside className={`lg:col-span-4 p-6 sm:p-10 flex flex-col gap-6 ${themeClasses.bgLightFaint} bg-opacity-30`}>
              {(publicContact.email || publicContact.phone || publicContact.contactPerson) && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className={`px-5 py-4 border-b border-gray-100 ${themeClasses.bgLight} bg-opacity-50`}>
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gray-900 m-0">
                      {t('venturesPageContactSection')}
                    </h3>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <DetailField label={t('ventureDetailContactPerson', 'Contact person')} value={publicContact.contactPerson} icon={User} />
                    <DetailField label={t('emailLabel')} value={publicContact.email} icon={Mail} />
                    <DetailField label={t('domainsPagePhoneLabel')} value={publicContact.phone} icon={Phone} />
                  </div>
                </div>
              )}

              {(b.website || b.videoUrl) && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className={`px-5 py-4 border-b border-gray-100 ${themeClasses.bgLight} bg-opacity-50`}>
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gray-900 m-0">
                      {t('venturesPageLinksSection')}
                    </h3>
                  </div>
                  <div className="p-3 flex flex-col gap-1">
                    {b.website && (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors group"
                      >
                        <Globe className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                        <span className="flex-1">{t('venturesPageWebsiteLink')}</span>
                        <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-400" />
                      </a>
                    )}
                    {b.videoUrl && (
                      <a
                        href={b.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors group"
                      >
                        <PlayCircle className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                        <span className="flex-1">{t('venturesPageVideoLink')}</span>
                        <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-400" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {venture.listedBy && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className={`px-5 py-4 border-b border-gray-100 ${themeClasses.bgLight} bg-opacity-50`}>
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gray-900 m-0">
                      {t('venturesPageListedBySection')}
                    </h3>
                  </div>
                  <div className="p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${themeClasses.bgLight} ${themeClasses.bgBorder} border flex items-center justify-center font-bold ${themeClasses.textMainDark} text-lg shadow-sm`}>
                      {venture.listedBy.firstname?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 text-sm truncate">
                        {venture.listedBy.firstname} {venture.listedBy.lastname}
                      </div>
                      <div className="text-xs font-medium text-gray-500 truncate mt-0.5">{venture.listedBy.email}</div>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>

          <div className="border-t border-gray-100 px-5 sm:px-8 py-4 bg-white flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-start">
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
                    ? 'w-full sm:w-auto px-6 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[0.95rem] font-bold cursor-not-allowed shadow-sm'
                    : canSubmit
                      ? isCoVenture
                        ? 'w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full text-[0.95rem] font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 border border-teal-500'
                        : 'w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[0.95rem] font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 border border-indigo-500'
                      : 'w-full sm:w-auto px-6 py-3 bg-gray-100 border border-gray-200 text-gray-400 rounded-full text-[0.95rem] font-bold cursor-not-allowed shadow-sm'
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
