import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import VentureListingCard from '../components/listings/VentureListingCard';
import ListingCardShell from '../components/listings/ListingCardShell';
import { useTranslation } from 'react-i18next';
import { coVentureAPI, ventureAPI, ventureDealAPI, venturePitchAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import CoVentureModal from '../components/venture/CoVentureModal';
import VentureBidModal from '../components/venture/VentureBidModal';
import VentureGstinVerificationModal from '../components/venture/VentureGstinVerificationModal';
import { useLikes } from '../hooks/useLikes';
import { useFilterSort } from '../hooks/useFilterSort';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import PageContentSkeleton from '../components/common/PageContentSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import VentureLogo from '../assets/Coventure_logo.png';
import VentureSubNav from '../components/venture/VentureSubNav';
import { VENTURE_INDUSTRY_OPTIONS } from '../constants/listingCategories';
import { asArray } from '../utils/asArray';
import { fetchAllListPages } from '../utils/listPagination';
import { resolveMarketplaceListingRows, isListingOwner } from '../utils/listingVisibility';
import VentureListingQuickActions from '../components/venture/VentureListingQuickActions';
import { ventureListChooseUrl } from '../constants/ventureListingTypeContent';
import { isCoVentureListing, isVentureBidListing } from '../utils/ventureListingHelpers';
import { unwrapApiData } from '../utils/apiResponse';
import PayoutSettingsButton from '../components/payout/PayoutSettingsButton';
import PayoutProfileBanner from '../components/payout/PayoutProfileBanner';
import ListingBackLink from '../components/common/ListingBackLink';
import VenturesSplitColumns from '../components/venture/VenturesSplitColumns';

export default function VenturesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency, getSymbol } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') === 'mine' ? 'mine' : 'all';
  const listingModeParam = searchParams.get('mode');
  const listingModeFilter = listingModeParam === 'co-venture'
    ? 'CO_VENTURE'
    : listingModeParam === 'venture'
      ? 'VENTURE'
      : null;

  const [allVentures, setAllVentures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyTarget, setApplyTarget] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterTab, setFilterTab] = useState(tabFromUrl);

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

  useEffect(() => {
    const legacyId = searchParams.get('id') || searchParams.get('highlight');
    if (!legacyId) return;
    const next = new URLSearchParams(searchParams);
    next.delete('id');
    next.delete('highlight');
    const qs = next.toString();
    navigate(`/ventures/${legacyId}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [searchParams, navigate]);

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', allVentures);

  const showSplitColumns = !listingModeFilter;

  const marketplaceRows = useMemo(() => {
    const source = listingModeFilter
      ? allVentures.filter((venture) => (
        listingModeFilter === 'CO_VENTURE'
          ? isCoVentureListing(venture)
          : !isCoVentureListing(venture)
      ))
      : allVentures;

    if (filterTab === 'mine') {
      return resolveMarketplaceListingRows(source, {
        tab: 'mine',
        user,
        type: 'venture',
      });
    }
    return source;
  }, [allVentures, filterTab, listingModeFilter, user]);

  // ── Filter / sort / paginate ───────────────────────────────────────────────
  const {
    paginated,
    filtered,
    totalCount,
    search, category, minPrice, maxPrice, sortBy,
    handleSearch, handleCategory, handleMinPrice, handleMaxPrice, handleSort,
    clearAll, activeFilterCount,
    page, totalPages, setPage,
  } = useFilterSort(
    marketplaceRows,
    {
      searchFields: ['brandDetails.brandName', 'brandDetails.description', 'brand_details.brand_name', 'brand_details.description'],
      priceField: 'brandDetails.dealValue',
      categoryField: 'brandDetails.industry',
      dateField: 'createdAt',
    },
    20,
    {
      getLikeCount: (item) => getLike(item.id).count,
      resetPageWhen: `${filterTab}:${listingModeFilter ?? 'all'}`,
    },
  );

  const ventureRows = useMemo(
    () => filtered.filter((venture) => !isCoVentureListing(venture)),
    [filtered],
  );

  const coVentureRows = useMemo(
    () => filtered.filter(isCoVentureListing),
    [filtered],
  );

  const renderVentureCards = (ventures, { compact = false } = {}) => (
    <div
      className={`listing-card-glow-grid venture-listing-grid grid gap-4 md:gap-5 ${compact
          ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 min-[1400px]:grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
    >
      {ventures.map((v) => (
        <ListingCardShell key={v.id}>
          <VentureListingCard
            venture={v}
            isOwner={isListingOwner(v, user, 'venture')}
            hasApplied={appliedVentureIds.has(v.id)}
            hasActiveDeal={ventureDealByVentureId.has(v.id)}
            showVerifyButton={false}
            compact={compact}
            likeState={getLike(v.id)}
            onLike={() => toggleLike(v.id)}
            onView={() => navigate(`/ventures/${v.id}`)}
            onApply={() => handleBuyerAction(v)}
            onVerify={() => setVerifyTarget(v)}
            onEdit={() => navigate(`/ventures/${v.id}/edit`)}
            onDelete={() => setDeleteTarget(v.id)}
          />
        </ListingCardShell>
      ))}
    </div>
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const loadAll = filterTab === 'mine'
      ? ventureAPI.getMyVentures().then(({ data }) => asArray(data))
      : fetchAllListPages((params) => ventureAPI.getAll({ ...params, include_pending: true }));

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
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
    const existingDeal = ventureDealByVentureId.get(venture.id);
    if (existingDeal?.id) {
      navigate(`/ventures/deals/${existingDeal.id}`);
      return;
    }
    setApplyTarget(venture);
  };

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
    fetchAllListPages((params) => ventureAPI.getAll({ ...params, include_pending: true }))
      .then((rows) => setAllVentures(rows));
  };

  return (
    <AppLayout>
      <style>{`
        /* Nest Hub Max (1280×800): inner card grids 1-col */
        @media (min-width: 1024px) and (max-width: 1400px) {
          .ventures-split__body .venture-listing-grid,
          .ventures-split__body .listing-card-glow-grid.venture-listing-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <ListingBackLink />
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 m-0">
            {listingModeFilter === 'CO_VENTURE'
              ? t('coVentureSectionTitle', { defaultValue: 'Delta-Ventures' })
              : listingModeFilter === 'VENTURE'
                ? t('venture')
                : t('coVentures')}
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {listingModeFilter === 'CO_VENTURE'
              ? t('coVenturesPageSubtitle', {
                defaultValue: 'Browse partnership and co-founder opportunities.',
              })
              : listingModeFilter === 'VENTURE'
                ? t('venturesPageSubtitle')
                : t('venturesPageSplitSubtitle', {
                  defaultValue: 'Browse venture sales and Delta-Ventures partnerships side by side.',
                })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <VentureListingQuickActions />
          {user ? <PayoutSettingsButton className="btn-glow btn-glow-sm" /> : null}
        </div>
      </div>

      {user ? <PayoutProfileBanner context="venture" className="mb-4" /> : null}

      <VentureSubNav
        activeRoute="marketplace"
        marketplaceTab={filterTab}
        onMarketplaceTabChange={handleMarketplaceTabChange}
      />

      {/* ── Filter bar ── */}
      <FilterBar
        search={search} onSearch={handleSearch}
        category={category} onCategory={handleCategory}
        categoryOptions={VENTURE_INDUSTRY_OPTIONS}
        minPrice={minPrice} onMinPrice={handleMinPrice}
        maxPrice={maxPrice} onMaxPrice={handleMaxPrice}
        sortBy={sortBy} onSort={handleSort}
        onClear={clearAll} activeFilterCount={activeFilterCount}
        placeholder={t('venturesPageSearchPlaceholder')}
        priceSymbol={getSymbol(currency)}
        theme="light"
      />

      {/* ── Result count ── */}
      {!loading && totalCount > 0 && !showSplitColumns && (
        <div className="text-sm text-gray-600 mb-4">
          {t('venturesPageResultsFound', { count: totalCount })}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <PageContentSkeleton variant="cards" rows={8} />
      ) : totalCount === 0 ? (
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
            : <Link to={ventureListChooseUrl('venture')} className="btn-glow btn-glow-sm">{t('venturesPageListVentureCta')}</Link>
          }
        </div>
      ) : showSplitColumns ? (
        <VenturesSplitColumns
          ventureRows={ventureRows}
          coVentureRows={coVentureRows}
          filterTab={filterTab}
          renderVentureCards={renderVentureCards}
        />
      ) : (
        <>
          {renderVentureCards(paginated)}
          <Pagination
            page={page} totalPages={totalPages}
            onPage={setPage} totalCount={totalCount} pageSize={20}
          />
        </>
      )}

      {/* ── Modals ── */}
      {applyTarget && isVentureBidListing(applyTarget) && !isCoVentureListing(applyTarget) && (
        <VentureBidModal
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
