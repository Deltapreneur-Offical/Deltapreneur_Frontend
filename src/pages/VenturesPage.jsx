import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import VentureListingCard from '../components/listings/VentureListingCard';
import ListingCardShell from '../components/listings/ListingCardShell';
import EditActionLabel from '../components/common/EditActionLabel';
import { VENTURE_EQUITY_TYPE_LABELS, formatEquityOfferedPct } from '../constants/ventureLabels';
import { useTranslation } from 'react-i18next';
import { coVentureAPI, ventureAPI, ventureDealAPI, venturePitchAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import CoVentureModal from '../components/venture/CoVentureModal';
import VenturePitchModal from '../components/venture/VenturePitchModal';
import VentureOfferModal from '../components/venture/VentureOfferModal';
import VentureGstinVerificationModal from '../components/venture/VentureGstinVerificationModal';
import { useLikes } from '../hooks/useLikes';
import LikeButton from '../components/common/LikeButton';
import { useFilterSort } from '../hooks/useFilterSort';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import PageContentSkeleton from '../components/common/PageContentSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import VentureLogo from '../assets/Coventure_logo.png';
import VentureSubNav from '../components/venture/VentureSubNav';
import { resolveVenturePublicContact } from '../utils/ventureProfileUtils';
import { APP_BASE_URL } from '../config/urls';
import { VENTURE_INDUSTRY_OPTIONS } from '../constants/listingCategories';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import { asArray } from '../utils/asArray';
import { fetchAllListPages } from '../utils/listPagination';
import { resolveMarketplaceListingRows, isListingOwner } from '../utils/listingVisibility';
import VentureListingTypeGuide from '../components/venture/VentureListingTypeGuide';
import { isCoVentureListing, isFullAcquisitionListing, isEquitySaleListing, resolveSellerAskSummary, resolveVentureInterestCount, formatVentureAskingPrice } from '../utils/ventureListingHelpers';
import { unwrapApiData } from '../utils/apiResponse';
import VentureCompanyProfileSummary from '../components/venture/VentureCompanyProfileSummary';

export default function VenturesPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading }  = useAuth();
  const { currency, getSymbol } = useCurrency();
  const navigate  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') === 'mine' ? 'mine' : 'all';

  const [allVentures, setAllVentures]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [applyTarget, setApplyTarget]       = useState(null);
  const [verifyTarget, setVerifyTarget]     = useState(null);
  const [detailTarget, setDetailTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [filterTab, setFilterTab]           = useState(tabFromUrl);

  const handleMarketplaceTabChange = (tab) => {
    setFilterTab(tab);
    if (tab === 'mine') {
      setSearchParams({ tab: 'mine' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  useEffect(() => {
    setFilterTab(tabFromUrl);
  }, [tabFromUrl]);
  const [appliedVentureIds, setAppliedVentureIds] = useState(() => new Set());
  const [ventureDealByVentureId, setVentureDealByVentureId] = useState(() => new Map());
  const [accessNotice, setAccessNotice]       = useState('');

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', allVentures);

  // ── Filter / sort / paginate ───────────────────────────────────────────────
  const {
    paginated, totalCount,
    search, category, minPrice, maxPrice, sortBy,
    handleSearch, handleCategory, handleMinPrice, handleMaxPrice, handleSort,
    clearAll, activeFilterCount,
    page, totalPages, setPage,
  } = useFilterSort(
    resolveMarketplaceListingRows(allVentures, {
      tab: filterTab,
      user,
      type: 'venture',
    }),
    {
      searchFields:  ['brandDetails.brandName', 'brandDetails.description', 'brand_details.brand_name', 'brand_details.description'],
      priceField:    'brandDetails.dealValue',
      categoryField: 'brandDetails.industry',
      dateField:     'createdAt',
    },
    20,
    {
      getLikeCount: (item) => getLike(item.id).count,
      resetPageWhen: filterTab,
    },
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const loadAll = filterTab === 'mine'
      ? ventureAPI.getMyVentures().then(({ data }) => asArray(data))
      : fetchAllListPages((params) => ventureAPI.getAll(params));

    loadAll
      .then((rows) => {
        if (!cancelled) setAllVentures(rows);
      })
      .catch(() => {
        if (!cancelled) setAllVentures([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filterTab]);

  useEffect(() => {
    Promise.all([
      venturePitchAPI.getMy().catch(() => ({ data: [] })),
      coVentureAPI.getMyApplications().catch(() => ({ data: [] })),
    ]).then(([pitchRes, coRes]) => {
      const ids = new Set();
      asArray(pitchRes.data)
        .filter((p) => ['PENDING', 'SHORTLISTED', 'SELLER_ACCEPTED', 'DEAL_SELECTED'].includes(p.status))
        .forEach((p) => { if (p.ventureId) ids.add(p.ventureId); });
      asArray(coRes.data)
        .filter((a) => a.status === 'PENDING' || a.status === 'APPROVED')
        .forEach((a) => {
          const id = a.ventureId || a.venture?.id;
          if (id) ids.add(id);
        });
      setAppliedVentureIds(ids);
    });
  }, []);

  useEffect(() => {
    ventureDealAPI.getMy()
      .then(({ data }) => {
        const deals = asArray(unwrapApiData(data) ?? data);
        const map = new Map();
        deals.forEach((deal) => {
          const ventureId = deal.ventureId;
          if (!ventureId) return;
          if (['PENDING_ADMIN_APPROVAL', 'PENDING_PAYMENT', 'PAYMENT_HELD', 'IN_PROGRESS', 'COMPLETED'].includes(deal.dealStatus)) {
            map.set(ventureId, deal);
          }
        });
        setVentureDealByVentureId(map);
      })
      .catch(() => setVentureDealByVentureId(new Map()));
  }, []);

  const handleBuyerAction = (venture) => {
    const existingDeal = ventureDealByVentureId.get(venture.id);
    if (existingDeal?.id) {
      navigate(`/ventures/deals/${existingDeal.id}`);
      return;
    }
    setApplyTarget(venture);
  };

  const { closeListingDetail, openDetailIfAllowed } = useOpenListingDetailFromUrl({
    items: allVentures,
    loading,
    setDetail: setDetailTarget,
    fetchById: async (id) => {
      const { data } = await ventureAPI.get(id);
      return data?.data ?? data;
    },
    listingType: 'venture',
    user,
    authLoading,
    onAccessDenied: () => {
      setAccessNotice(t('listingDetailAccessDenied', 'This listing is not available to view yet.'));
    },
  });

  const handleDelete = async () => {
    try {
      await ventureAPI.delete(deleteTarget);
      setAllVentures(v => v.filter(x => x.id !== deleteTarget));
    } catch (err) {
      alert(err.response?.data?.error || t('venturesPageDeleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  };

  const refreshVentures = () => {
    if (filterTab === 'mine') {
      ventureAPI.getMyVentures().then(({ data }) => setAllVentures(asArray(data)));
      return;
    }
    fetchAllListPages((params) => ventureAPI.getAll(params))
      .then((rows) => setAllVentures(rows));
  };

  return (
    <AppLayout>
      <div className="mb-2 min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 m-0">{t('venture')}</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">{t('venturesPageSubtitle')}</p>
      </div>

      <VentureSubNav
        activeRoute="marketplace"
        marketplaceTab={filterTab}
        onMarketplaceTabChange={handleMarketplaceTabChange}
      />

      <VentureListingTypeGuide />

        {accessNotice && (
          <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {accessNotice}
          </div>
        )}

        {/* ── Filter bar ── */}
        <FilterBar
          search={search}           onSearch={handleSearch}
          category={category}       onCategory={handleCategory}
          categoryOptions={VENTURE_INDUSTRY_OPTIONS}
          minPrice={minPrice}       onMinPrice={handleMinPrice}
          maxPrice={maxPrice}       onMaxPrice={handleMaxPrice}
          sortBy={sortBy}           onSort={handleSort}
          onClear={clearAll}        activeFilterCount={activeFilterCount}
          placeholder={t('venturesPageSearchPlaceholder')}
          priceSymbol={getSymbol(currency)}
          theme="light"
        />

        {/* ── Result count ── */}
        {!loading && totalCount > 0 && (
          <div className="text-sm text-gray-600 mb-4">
            {t('venturesPageResultsFound', { count: totalCount })}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <PageContentSkeleton variant="cards" rows={8} />
        ) : paginated.length === 0 ? (
          <div className="text-center py-20">
            <div className="mb-4 flex justify-center">
              <img src={VentureLogo} alt={t('ventures')} className="w-16 h-16 opacity-50" />
            </div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
              {activeFilterCount > 0 ? t('venturesPageEmptyFilteredTitle') :
               filterTab === 'mine' ? t('venturesPageEmptyMineTitle') :
               t('venturesPageEmptyAllTitle')}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeFilterCount > 0
                ? t('venturesPageEmptyFilteredHint')
                : t('venturesPageEmptyAllHint')}
            </p>
            {activeFilterCount > 0
              ? <button className="btn-glow btn-glow-sm" onClick={clearAll}>{t('filterClear')}</button>
              : <Link to="/ventures/new" className="btn-glow btn-glow-sm">{t('venturesPageListVentureCta')}</Link>
            }
          </div>
        ) : (
          <>
            <div className="listing-card-glow-grid grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
              {paginated.map(v => (
                <ListingCardShell key={v.id}>
                <VentureListingCard
                  venture={v}
                  isOwner={isListingOwner(v, user, 'venture')}
                  hasApplied={appliedVentureIds.has(v.id)}
                  hasActiveDeal={ventureDealByVentureId.has(v.id)}
                  showVerifyButton={false}
                  likeState={getLike(v.id)}
                  onLike={() => toggleLike(v.id)}
                  onView={() => openDetailIfAllowed(v)}
                  onApply={() => handleBuyerAction(v)}
                  onVerify={() => setVerifyTarget(v)}
                  onEdit={() => navigate(`/ventures/${v.id}/edit`)}
                  onDelete={() => setDeleteTarget(v.id)}
                />
                </ListingCardShell>
              ))}
            </div>
            <Pagination
              page={page} totalPages={totalPages}
              onPage={setPage} totalCount={totalCount} pageSize={20}
            />
          </>
        )}

      {/* ── Modals ── */}
      {detailTarget && (
        <VentureDetailModal
          venture={detailTarget}
          isOwner={isListingOwner(detailTarget, user, 'venture')}
          hasApplied={appliedVentureIds.has(detailTarget.id)}
          hasActiveDeal={ventureDealByVentureId.has(detailTarget.id)}
          activeDealId={ventureDealByVentureId.get(detailTarget.id)?.id}
          onClose={() => { closeListingDetail(); refreshVentures(); }}
          onApply={() => { handleBuyerAction(detailTarget); closeListingDetail(); }}
          onEdit={() => { navigate(`/ventures/${detailTarget.id}/edit`); closeListingDetail(); }}
          onDelete={() => { setDeleteTarget(detailTarget.id); closeListingDetail(); }}
        />
      )}

      {applyTarget && isFullAcquisitionListing(applyTarget) && (
        <VentureOfferModal
          venture={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSubmitted={() => {
            setAppliedVentureIds((prev) => new Set(prev).add(applyTarget.id));
            setApplyTarget(null);
            refreshVentures();
          }}
        />
      )}

      {applyTarget && isEquitySaleListing(applyTarget) && (
        <VenturePitchModal
          venture={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSubmitted={() => {
            setAppliedVentureIds((prev) => new Set(prev).add(applyTarget.id));
            setApplyTarget(null);
            refreshVentures();
          }}
        />
      )}

      {applyTarget && isCoVentureListing(applyTarget) && (
        <CoVentureModal
          venture={applyTarget}
          onClose={() => setApplyTarget(null)}
          onApplied={() => {
            setAppliedVentureIds((prev) => new Set(prev).add(applyTarget.id));
            setApplyTarget(null);
            refreshVentures();
          }}
        />
      )}

      {verifyTarget && (
        <VentureGstinVerificationModal
          venture={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onVerified={() => {
            setVerifyTarget(null);
            refreshVentures();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('venturesPageDeleteTitle')}
        message={t('venturesPageDeleteMessage')}
        confirmLabel={t('delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}


// ─── Venture Detail Modal ─────────────────────────────────────────────────────
function VentureDetailModal({
  venture,
  isOwner,
  hasApplied = false,
  hasActiveDeal = false,
  activeDealId,
  onClose,
  onApply,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const STAGE_LABELS = {
    IDEA: t('venturesPageStageIdea'),
    MVP: t('venturesPageStageMvp'),
    REVENUE_GENERATING: t('venturesPageStageRevenue'),
    SCALING: t('venturesPageStageScaling'),
  };
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched            = useRef(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    ventureAPI.get(venture.id)
      .then(({ data }) => setDetail(data?.data ?? data))
      .catch(() => setDetail(venture))
      .finally(() => setLoading(false));
  }, [venture.id]);

  const b = (detail || venture)?.brandDetails || {};
  const resolved = detail || venture;
  const publicContact = resolveVenturePublicContact(resolved, isOwner);
  const isCoVenture = isCoVentureListing(resolved);
  const isFullAcquisition = isFullAcquisitionListing(resolved);
  const equityPctLabel = formatEquityOfferedPct(
    resolved?.equityPercentOffered ?? resolved?.equity_percent_offered,
  );
  const sellerAsk = resolveSellerAskSummary(resolved);
  const interestCount = resolveVentureInterestCount(resolved);
  const interestLabel = isCoVenture ? 'applications' : 'pitches';
  const companyProfile = resolved?.companyProfile || resolved?.company_profile;
  const isListingApproved = (resolved?.listingApprovalStatus ?? resolved?.listing_approval_status) === 'APPROVED';
  const canSubmit = isListingApproved && !hasActiveDeal;
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="venture-detail-modal relative w-full max-w-[640px] h-[92dvh] sm:h-auto sm:max-h-[90vh] flex flex-col min-h-0 bg-white border border-gray-200 rounded-t-[18px] sm:rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden animate-slideUp">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />
        <button type="button" className="absolute top-4 right-4 z-30 bg-white/90 border border-gray-200 rounded-full w-9 h-9 text-gray-500 hover:text-gray-900 shadow-sm" onClick={onClose} aria-label="Close">✕</button>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="relative z-10 flex-shrink-0 px-4 sm:px-8 pt-6 pb-4 border-b border-gray-100 bg-white/95">
              <div className="flex items-start gap-3 sm:gap-4 pr-10">
                {b.ventureImageUrl
                  ? <img src={b.ventureImageUrl} alt={b.brandName} className="w-16 h-16 rounded-xl object-cover ring-2 ring-white shadow-md" />
                  : <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-display text-2xl font-bold text-white shadow-md">
                      {b.brandName?.[0] || '?'}
                    </div>
                }
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-gray-900 m-0 break-words">{b.brandName}</h2>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {b.industry && (
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">{b.industry.replace(/_/g, ' ')}</span>
                    )}
                    {equityPctLabel && isCoVenture && (
                      <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">{equityPctLabel} equity offered</span>
                    )}
                    {sellerAsk.equityLabel && !isCoVenture && (
                      <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">{sellerAsk.equityLabel} equity</span>
                    )}
                    {sellerAsk.dealTypeLabel && !isCoVenture && (
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">{sellerAsk.dealTypeLabel}</span>
                    )}
                  </div>
                </div>
              </div>

              {(sellerAsk.price || sellerAsk.equityLabel) && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 flex flex-wrap items-center gap-4">
                  {sellerAsk.price ? (
                    <div>
                      <div className="text-[0.68rem] font-bold uppercase tracking-wide text-emerald-700">Asking price</div>
                      <div className="text-xl font-bold text-emerald-800">{formatVentureAskingPrice(sellerAsk.price, formatPrice)}</div>
                    </div>
                  ) : null}
                  {sellerAsk.equityLabel ? (
                    <div>
                      <div className="text-[0.68rem] font-bold uppercase tracking-wide text-purple-700">Equity offered</div>
                      <div className="text-lg font-bold text-purple-800">{sellerAsk.equityLabel}</div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex gap-2 mt-3 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{t('venturesPageViewsLabel', { count: (detail?.views ?? venture.views) || 0 })}</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800">{interestCount} {interestLabel}</span>
              </div>
            </div>

            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-5">
              {b.description && (
                <Section title={t('venturesPageAboutSection')}>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {b.description}
                  </p>
                </Section>
              )}

              {(publicContact.email || publicContact.phone || publicContact.contactPerson) && (
                <Section title={t('venturesPageContactSection')}>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {publicContact.contactPerson && (
                      <DetailItem label="Contact person" value={publicContact.contactPerson} />
                    )}
                    {publicContact.email && (
                      <DetailItem label={t('emailLabel')} value={publicContact.email} />
                    )}
                    {publicContact.phone && (
                      <DetailItem label={t('domainsPagePhoneLabel')} value={publicContact.phone} />
                    )}
                  </div>
                </Section>
              )}

              {(b.website || b.videoUrl) && (
                <Section title={t('venturesPageLinksSection')}>
                  <div className="flex gap-3 flex-wrap">
                    {b.website && (
                      <a href={b.website} target="_blank" rel="noreferrer"
                         className="btn-glow btn-glow-sm">{t('venturesPageWebsiteLink')}</a>
                    )}
                    {b.videoUrl && (
                      <a href={b.videoUrl} target="_blank" rel="noreferrer"
                         className="btn-glow btn-glow-sm">{t('venturesPageVideoLink')}</a>
                    )}
                  </div>
                </Section>
              )}

              {(detail || venture).stage && (
                <Section title={t('venturesPageCurrentStageSection')}>
                  <span className="inline-block px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs text-indigo-600">
                    {STAGE_LABELS[(detail || venture).stage] || (detail || venture).stage}
                  </span>
                </Section>
              )}

              {(detail || venture).lookingFor && (
                <Section title={t('venturesPageLookingForSection')}>
                  <p className="text-gray-700 leading-relaxed text-sm m-0">
                    {(detail || venture).lookingFor}
                  </p>
                </Section>
              )}

              {(detail || venture).currentProblem && (
                <Section title={t('venturesPageChallengeSection')}>
                  <p className="text-gray-700 leading-relaxed text-sm m-0">
                    {(detail || venture).currentProblem}
                  </p>
                </Section>
              )}

              {companyProfile && (
                <Section title="Company Profile">
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <VentureCompanyProfileSummary profile={companyProfile} formatPrice={formatPrice} />
                  </div>
                </Section>
              )}

              {detail?.listedBy && (
                <Section title={t('venturesPageListedBySection')}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600 text-sm">
                      {detail.listedBy.firstname?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {detail.listedBy.firstname} {detail.listedBy.lastname}
                      </div>
                      <div className="text-xs text-gray-600 break-all">
                        {detail.listedBy.email}
                      </div>
                    </div>
                  </div>
                </Section>
              )}
            </div>

            <div className="relative z-20 flex-shrink-0 px-4 sm:px-8 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-sm flex flex-col sm:flex-row sm:flex-wrap gap-3">
              {isOwner ? (
                <>
                  <button type="button" className="btn-glow btn-glow-sm w-full sm:w-auto inline-flex items-center justify-center" onClick={onEdit}>
                    <EditActionLabel iconSize={16}>{t('edit')}</EditActionLabel>
                  </button>
                  <button type="button" className="w-full sm:w-auto px-5 py-2.5 bg-red-500 border border-red-500 text-white rounded-[10px] text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-red-600" onClick={onDelete}>{t('delete')}</button>
                </>
              ) : hasActiveDeal && activeDealId ? (
                <button
                  type="button"
                  className="btn-glow btn-glow-sm w-full sm:w-auto"
                  onClick={() => navigate(`/ventures/deals/${activeDealId}`)}
                >
                  Continue Purchase
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
                  onClick={canSubmit && !hasApplied ? onApply : undefined}
                  disabled={!canSubmit || hasApplied}
                  title={
                    hasApplied
                      ? (isCoVenture ? 'Partnership application already submitted' : 'Pitch already submitted')
                      : !canSubmit
                        ? 'Listing pending admin approval'
                        : undefined
                  }
                >
                  {hasApplied
                    ? (isCoVenture ? 'Applied' : 'Pitched')
                    : (isCoVenture
                      ? 'Apply as Partner'
                      : (isFullAcquisition ? 'Submit Acquisition Offer' : 'Submit Pitch'))}
                </button>
              )}
              <button type="button" className="w-full sm:w-auto px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-600 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-50" onClick={onClose}>{t('close')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-6 last:mb-2">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 m-0">{title}</h3>
      {children}
    </section>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-900 break-all">{value}</div>
    </div>
  );
}
