import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import VentureListingCard from '../components/listings/VentureListingCard';
import ListingCardShell from '../components/listings/ListingCardShell';
import EditActionLabel from '../components/common/EditActionLabel';
import { VENTURE_EQUITY_TYPE_LABELS } from '../constants/ventureLabels';
import { useTranslation } from 'react-i18next';
import { coVentureAPI, ventureAPI, ventureAuctionAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import CoVentureModal from '../components/venture/CoVentureModal';
import VentureGstinVerificationModal from '../components/venture/VentureGstinVerificationModal';
import { useLikes } from '../hooks/useLikes';
import LikeButton from '../components/common/LikeButton';
import { useFilterSort } from '../hooks/useFilterSort';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import PageContentSkeleton from '../components/common/PageContentSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import DashboardIcon from '../assets/Dashboard.png';
import VentureLogo from '../assets/Coventure_logo.png';
import { APP_BASE_URL } from '../config/urls';
import { VENTURE_INDUSTRY_OPTIONS } from '../constants/listingCategories';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import { asArray } from '../utils/asArray';
import { fetchAllListPages } from '../utils/listPagination';

export default function VenturesPage() {
  const { t } = useTranslation();
  const { user }  = useAuth();
  const { currency, getSymbol } = useCurrency();
  const navigate  = useNavigate();

  const [allVentures, setAllVentures]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [applyTarget, setApplyTarget]       = useState(null);
  const [verifyTarget, setVerifyTarget]     = useState(null);
  const [detailTarget, setDetailTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [filterTab, setFilterTab]           = useState('all');
  const [appliedVentureIds, setAppliedVentureIds] = useState(() => new Set());

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', allVentures);

  // ── Filter / sort / paginate ───────────────────────────────────────────────
  const {
    paginated, totalCount,
    search, category, minPrice, maxPrice, sortBy,
    handleSearch, handleCategory, handleMinPrice, handleMaxPrice, handleSort,
    clearAll, activeFilterCount,
    page, totalPages, setPage,
  } = useFilterSort(
    filterTab === 'mine'
      ? allVentures.filter(v => v.listedBy?.id === user?.id)
      : allVentures,
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
    coVentureAPI.getMyApplications()
      .then(({ data }) => {
        const items = asArray(data);
        const ids = new Set(
          items
            .map((item) => item?.ventureId || item?.venture_id || item?.venture?.id)
            .filter(Boolean),
        );
        setAppliedVentureIds(ids);
      })
      .catch(() => setAppliedVentureIds(new Set()));
  }, []);

  const { closeListingDetail } = useOpenListingDetailFromUrl({
    items: allVentures,
    loading,
    setDetail: setDetailTarget,
    fetchById: async (id) => {
      const { data } = await ventureAPI.get(id);
      return data?.data ?? data;
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
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-start lg:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 m-0">{t('venture')}</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">{t('venturesPageSubtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto lg:justify-end shrink-0">
            <button
              type="button"
              className="btn-glow btn-glow-sm flex items-center justify-center gap-2 text-sm py-2.5 px-4 min-h-[44px] flex-1 sm:flex-none"
              onClick={() => navigate('/ventures/dashboard')}
            >
              <img src={DashboardIcon} alt="" className="w-[18px] h-[18px] shrink-0" />
              <span>{t('dashboard')}</span>
            </button>
            <button
              type="button"
              className="btn-glow btn-glow-sm flex items-center justify-center gap-2 text-sm py-2.5 px-4 min-h-[44px] flex-1 sm:flex-none"
              onClick={() => navigate('/ventures/analytics')}
            >
              <span aria-hidden>📈</span>
              <span>{t('analytics')}</span>
            </button>
            <Link
              to="/ventures/new"
              className="btn-glow btn-glow-sm flex items-center justify-center gap-2 text-sm py-2.5 px-4 min-h-[44px] flex-1 sm:flex-none whitespace-nowrap"
            >
              {t('venturesPageListVentureCta')}
            </Link>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            className={`btn-glow btn-glow-sm text-sm py-2.5 px-4 min-h-[44px] ${filterTab === 'all' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            {t('allVentures')}
          </button>
          <button
            type="button"
            className={`btn-glow btn-glow-sm text-sm py-2.5 px-4 min-h-[44px] ${filterTab === 'mine' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => setFilterTab('mine')}
          >
            {t('venturesPageMyVentures')}
          </button>
        </div>

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
                  isOwner={v.listedBy?.id === user?.id}
                  hasApplied={appliedVentureIds.has(v.id)}
                  showVerifyButton={false}
                  likeState={getLike(v.id)}
                  onLike={() => toggleLike(v.id)}
                  onView={() => setDetailTarget(v)}
                  onApply={() => setApplyTarget(v)}
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
          isOwner={detailTarget.listedBy?.id === user?.id}
          hasApplied={appliedVentureIds.has(detailTarget.id)}
          onClose={() => { closeListingDetail(); refreshVentures(); }}
          onApply={() => { setApplyTarget(detailTarget); closeListingDetail(); }}
          onEdit={() => { navigate(`/ventures/${detailTarget.id}/edit`); closeListingDetail(); }}
          onDelete={() => { setDeleteTarget(detailTarget.id); closeListingDetail(); }}
        />
      )}

      {applyTarget && (
        <CoVentureModal
          venture={applyTarget}
          onClose={() => setApplyTarget(null)}
          onApplied={(ventureId) => {
            if (!ventureId) return;
            setAppliedVentureIds((prev) => {
              const next = new Set(prev);
              next.add(ventureId);
              return next;
            });
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
function VentureDetailModal({ venture, isOwner, hasApplied = false, onClose, onApply, onEdit, onDelete }) {
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
    if (hasFetched.current) return;
    hasFetched.current = true;
    ventureAPI.get(venture.id)
      .then(({ data }) => setDetail(data?.data ?? data))
      .catch(() => setDetail(venture))
      .finally(() => setLoading(false));
  }, [venture.id]);

  const b = (detail || venture)?.brandDetails || {};
  const c = (detail || venture)?.contactInfo  || {};
  const isGstinVerified = Boolean((detail || venture)?.verified || (detail || venture)?.gstinVerified);

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="venture-detail-modal relative w-full max-w-[620px] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-t-[18px] sm:rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-slideUp">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors duration-200 hover:text-gray-700" onClick={onClose}>✕</button>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative z-10 p-4 sm:p-8 pb-4 sm:pb-6">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                {b.ventureImageUrl
                  ? <img src={b.ventureImageUrl} alt={b.brandName}
                         className="w-14 h-14 rounded-xl object-cover" />
                  : <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-display text-2xl font-bold text-indigo-600">
                      {b.brandName?.[0] || '?'}
                    </div>
                }
                <div>
                  <h2 className="font-display text-xl sm:text-[1.75rem] font-semibold text-gray-900 m-0 break-words">{b.brandName}</h2>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {b.industry && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded">{b.industry.replace(/_/g, ' ')}</span>
                    )}
                    {b.ventureType && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs font-semibold rounded">
                        {VENTURE_EQUITY_TYPE_LABELS[b.ventureType] || b.ventureType}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
                {b.dealValue && (
                  <div className="px-3 sm:px-4 py-2 bg-green-50 border border-green-300 rounded-lg text-sm text-green-700">
                    💰 {formatPrice(b.dealValue)}
                  </div>
                )}
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {t('venturesPageViewsLabel', { count: (detail?.views ?? venture.views) || 0 })}
                </div>
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {t('venturesPageApplicationsLabel', { count: (detail?.coVentureApplicationCount ??
                       venture.coVentureApplicationCount) || 0 })}
                </div>
              </div>
            </div>

            <div className="relative z-10 px-4 sm:px-8">
              {b.description && (
                <Section title={t('venturesPageAboutSection')}>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {b.description}
                  </p>
                </Section>
              )}

              {(c.email || c.phoneNumber) && (
                <Section title={t('venturesPageContactSection')}>
                  <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-4">
                    {c.email       && <DetailItem label={t('emailLabel')} value={c.email} />}
                    {c.phoneNumber && <DetailItem label={t('domainsPagePhoneLabel')} value={c.phoneNumber} />}
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

            {/* Actions */}
            <div className="relative z-10 px-4 sm:px-8 pb-6 sm:pb-8 flex flex-col sm:flex-row sm:flex-wrap gap-3 border-t border-gray-100 pt-4 sm:pt-0 sm:border-t-0 mt-2 sm:mt-0">
              {isOwner ? (
                <>
                  <button type="button" className="btn-glow btn-glow-sm w-full sm:w-auto inline-flex items-center justify-center" onClick={onEdit}>
                    <EditActionLabel iconSize={16}>{t('edit')}</EditActionLabel>
                  </button>
                  <button type="button" className="w-full sm:w-auto px-5 py-2.5 bg-red-500 border border-red-500 text-white rounded-[10px] text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-red-600" onClick={onDelete}>{t('delete')}</button>
                </>
              ) : (
                <button
                  type="button"
                  className={
                    hasApplied
                      ? 'w-full sm:w-auto px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-sm font-semibold cursor-not-allowed'
                      : isGstinVerified
                        ? 'btn-glow btn-glow-sm w-full sm:w-auto'
                        : 'w-full sm:w-auto px-5 py-2.5 bg-gray-100 border border-gray-200 text-gray-400 rounded-full text-sm font-semibold cursor-not-allowed'
                  }
                  onClick={isGstinVerified && !hasApplied ? onApply : undefined}
                  disabled={!isGstinVerified || hasApplied}
                  title={
                    hasApplied
                      ? t('venturesPageAlreadyAppliedTitle')
                      : !isGstinVerified
                        ? t('venturesPageGstRequiredTitle')
                        : undefined
                  }
                >
                  {hasApplied ? t('venturesPageApplied') : isGstinVerified ? t('venturesPageCoVenture') : t('venturesPageGstPending')}
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
    <div className="mb-5">
      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-sm text-gray-900 break-all">{value}</div>
    </div>
  );
}
