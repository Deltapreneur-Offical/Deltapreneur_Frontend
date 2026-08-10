import { useMemo, useState, useCallback, useEffect } from 'react';
import { Headset, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ListingBackLink from '../components/common/ListingBackLink';
import FilterBar from '../components/common/FilterBar';
import PageContentSkeleton from '../components/common/PageContentSkeleton';
import OperationsRequestModal from '../components/operations/OperationsRequestModal';
import OperationsRequestSuccess from '../components/operations/OperationsRequestSuccess';
import OperationsServiceCard from '../components/operations/OperationsServiceCard';
import OperationsSectionTabs from '../components/operations/OperationsSectionTabs';
import FeaturedVirtualAssistantsListing, { useFeaturedVirtualAssistants } from '../components/virtual-assistant/FeaturedVirtualAssistantsListing';
import VirtualAssistantPreviewModal from '../components/virtual-assistant/VirtualAssistantPreviewModal';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { operationsAPI, operationsRequestAPI, virtualAssistantAPI } from '../api/services';
import { asArray } from '../utils/asArray';
import { unwrapApiData } from '../utils/apiResponse';
import { OPERATIONS_CATEGORY_OPTIONS } from '../utils/operationsCategories';
import { formatRequestAdminPrice } from '../utils/operationsPricing';
import { getRequestStatusLabel } from '../utils/operationsRequestLabels';
import { OPERATIONS_SECTIONS, resolveOperationsSection } from '../utils/operationsSections';

function formatMyRequestDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function OperationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { id: routeVaId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionId = searchParams.get('section') || 'assistance';
  const activeSection = resolveOperationsSection(sectionId);
  const hireIntent = searchParams.get('intent') === 'hire';

  const [services, setServices] = useState([]);
  const [sectionCounts, setSectionCounts] = useState({ assistance: 0, compliance: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [detailProfile, setDetailProfile] = useState(null);

  const loadMyRequests = useCallback(async () => {
    if (!user) {
      setMyRequests([]);
      return;
    }
    setMyRequestsLoading(true);
    try {
      const { data } = await operationsRequestAPI.listMine();
      setMyRequests(asArray(data));
    } catch {
      setMyRequests([]);
    } finally {
      setMyRequestsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  useEffect(() => {
    let cancelled = false;
    operationsAPI
      .list()
      .then(({ data }) => {
        if (cancelled) return;
        const rows = asArray(data);
        const complianceCount = rows.filter(
          (row) => (row.serviceType || 'virtual_assistance') === 'compliance',
        ).length;
        setSectionCounts((prev) => ({
          ...prev,
          compliance: complianceCount,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setSectionCounts((prev) => ({ ...prev, compliance: 0 }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isCompliance = activeSection.id === 'compliance';
  const isAssistance = activeSection.id === 'assistance';
  const { cards: featuredVaCards, count: featuredVaCount, loading: featuredVaLoading, patchProfile } = useFeaturedVirtualAssistants(50);
  const vaDetailId = routeVaId || searchParams.get('id');

  useEffect(() => {
    if (!vaDetailId || isAssistance) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('section', 'assistance');
      return next;
    }, { replace: true });
  }, [vaDetailId, isAssistance, setSearchParams]);

  const { closeListingDetail } = useOpenListingDetailFromUrl({
    items: featuredVaCards,
    loading: featuredVaLoading,
    setDetail: setDetailProfile,
    fetchById: async (id) => {
      const response = await virtualAssistantAPI.getPublicProfile(id);
      return unwrapApiData(response);
    },
    allowUrlDetail: Boolean(vaDetailId),
  });

  // Record VA profile views on every detail open (including in-list card clicks).
  useEffect(() => {
    if (!detailProfile?.id) return undefined;

    let cancelled = false;
    virtualAssistantAPI.getPublicProfile(detailProfile.id)
      .then((response) => {
        if (cancelled) return;
        const fresh = unwrapApiData(response);
        if (!fresh) return;
        const views = Number(fresh.views ?? 0);
        patchProfile(fresh.id, { views });
        setDetailProfile((prev) => (
          prev && String(prev.id) === String(fresh.id) ? { ...prev, views } : prev
        ));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [detailProfile?.id, patchProfile]);

  const openVaDetailInUrl = useCallback((profileId, { intent } = {}) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', 'assistance');
    next.set('id', String(profileId));
    if (intent === 'hire') next.set('intent', 'hire');
    else next.delete('intent');
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setSectionCounts((prev) => ({ ...prev, assistance: featuredVaCount }));
  }, [featuredVaCount]);

  useEffect(() => {
    if (isAssistance) return undefined;

    let cancelled = false;
    setLoading(true);
    operationsAPI
      .list({ serviceType: activeSection.serviceType })
      .then(({ data }) => {
        if (!cancelled) setServices(asArray(data));
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSection.serviceType, isAssistance]);

  useEffect(() => {
    if (isAssistance) return;
    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('price_asc');
  }, [activeSection.id, isAssistance]);

  const setSection = (nextSectionId) => {
    setSearchParams({ section: nextSectionId }, { replace: true });
  };

  const categoryOptions = useMemo(() => {
    const present = new Set(services.map((s) => s.category).filter(Boolean));
    return OPERATIONS_CATEGORY_OPTIONS.filter((opt) => present.has(opt.value));
  }, [services]);

  const sortOptions = useMemo(
    () => [
      { value: 'price_asc', label: t('sortPriceLowHigh') },
      { value: 'price_desc', label: t('sortPriceHighLow') },
      { value: 'name_asc', label: t('operationsSortNameAZ', { defaultValue: 'Name A–Z' }) },
    ],
    [t],
  );

  const activeFilterCount = [search.trim(), category, minPrice, maxPrice].filter(Boolean).length;

  const clearAll = useCallback(() => {
    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('price_asc');
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = services.filter((s) => {
      if (category && s.category !== category) return false;
      if (minPrice !== '' && Number(s.price) < Number(minPrice)) return false;
      if (maxPrice !== '' && Number(s.price) > Number(maxPrice)) return false;
      if (!q) return true;
      const haystack = `${s.name || ''} ${s.description || ''} ${s.skills || ''} ${s.category || ''}`.toLowerCase();
      return haystack.includes(q);
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return Number(a.price) - Number(b.price);
    });

    return result;
  }, [search, category, minPrice, maxPrice, sortBy, services]);

  const isFiltered = activeFilterCount > 0;
  const roleCountLabel = isAssistance
    ? t('operationsFeaturedVaAvailable', {
        count: featuredVaCount,
        defaultValue: '{{count}} Featured Virtual Assistants',
      })
    : isFiltered
    ? t('operationsRolesShowing', { count: filtered.length, total: services.length, defaultValue: '{{count}} of {{total}} Roles' })
    : t(
        isCompliance ? 'operationsComplianceAvailable' : 'operationsRolesAvailable',
        {
          count: services.length,
          defaultValue: isCompliance
            ? '{{count}} Business Solutions Available'
            : '{{count}} Virtual Roles Available',
        },
      );

  const SectionIcon = isCompliance ? ShieldCheck : Headset;

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 min-w-0">
        <ListingBackLink />
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 px-5 py-5 sm:px-7 sm:py-6 text-white">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                <SectionIcon size={22} strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-0.5">
                  {t('operationsTitle', { defaultValue: 'Operations' })}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {t(activeSection.labelKey, { defaultValue: activeSection.defaultLabel })}
                </h1>
                <p className="mt-1.5 text-sm text-white/75 max-w-xl leading-relaxed">
                  {isCompliance
                    ? t('operationsComplianceSubtitle', {
                        defaultValue: 'Registration, filings, and business services for your venture.',
                      })
                    : t('operationsSubtitle', {
                        defaultValue: 'Hire skilled virtual professionals to run HR, finance, marketing, tech, and day-to-day operations.',
                      })}
                </p>
              </div>
            </div>
          </div>
        </section>

        <OperationsSectionTabs
          activeSectionId={activeSection.id}
          onChange={setSection}
          counts={sectionCounts}
          variant="public"
          ariaLabel={t('operations', { defaultValue: 'Operations' })}
        />

        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
                {isCompliance
                  ? t('operationsComplianceFindHeading', { defaultValue: 'Find Business Solutions' })
                  : t('operationsFeaturedVaHeading', { defaultValue: 'Featured Virtual Assistants' })}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {isCompliance
                  ? t('operationsComplianceFindSubtitle', { defaultValue: 'Expert registration and business support for your venture.' })
                  : t('operationsFeaturedVaSubtitle', {
                      defaultValue: 'Published virtual assistants selected for the homepage and operations showcase.',
                    })}
              </p>
            </div>
            <p className="text-sm text-gray-500 shrink-0">
              <span className="font-medium text-gray-800">{roleCountLabel}</span>
            </p>
          </div>

          {isAssistance ? (
            <FeaturedVirtualAssistantsListing
              layout="grid"
              pageSize={50}
              cards={featuredVaCards}
              loading={featuredVaLoading}
              onViewProfile={(profileId) => openVaDetailInUrl(profileId)}
              onHireProfile={(profileId) => openVaDetailInUrl(profileId, { intent: 'hire' })}
            />
          ) : (
            <>
              <FilterBar
                search={search}
                onSearch={setSearch}
                category={category}
                onCategory={setCategory}
                categoryOptions={categoryOptions}
                minPrice={minPrice}
                onMinPrice={setMinPrice}
                maxPrice={maxPrice}
                onMaxPrice={setMaxPrice}
                sortBy={sortBy}
                onSort={setSortBy}
                sortOptions={sortOptions}
                onClear={clearAll}
                activeFilterCount={activeFilterCount}
                placeholder={t('operationsSearchPlaceholder', { defaultValue: 'Search roles by name or skill…' })}
                theme="light"
              />

              {loading ? (
                <PageContentSkeleton variant="grid" rows={6} />
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 bg-white">
                  <p className="text-base font-semibold text-gray-900 mb-1">
                    {t('operationsComplianceEmptyTitle', { defaultValue: 'No services available yet' })}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('operationsComplianceEmptyBody', { defaultValue: 'Business solutions will appear here once added by the admin team.' })}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
                  {filtered.map((service) => (
                    <OperationsServiceCard
                      key={service.id}
                      service={service}
                      onHire={() => {
                        if (!user) {
                          navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
                          return;
                        }
                        setRequestTarget(service);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {user && (
          <section className="operations-my-requests">
            <div className="mb-3">
              <h2 className="font-display text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
                {t('operationsMyRequestsTitle', { defaultValue: 'My Requests' })}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {t('operationsMyRequestsSubtitle', {
                  defaultValue: 'Track whether you submitted a hire request or booked a service slot.',
                })}
              </p>
            </div>

            {myRequestsLoading ? (
              <PageContentSkeleton variant="table" rows={3} />
            ) : myRequests.length === 0 ? (
              <div className="operations-my-requests-empty">
                <p className="text-sm font-medium text-gray-700">
                  {t('operationsMyRequestsEmpty', {
                    defaultValue: 'You have not submitted any hire or booking requests yet.',
                  })}
                </p>
              </div>
            ) : (
              <div className="operations-my-requests-list">
                {myRequests.map((row) => (
                    <article key={row.id} className="operations-my-requests-item">
                      <div className="operations-my-requests-item-main">
                        <p className="operations-my-requests-date">{formatMyRequestDate(row.createdAt)}</p>
                        <h3 className="operations-my-requests-service">{row.serviceName}</h3>
                        <div className="operations-my-requests-meta">
                          <span className="operations-my-requests-price">{formatRequestAdminPrice(row, formatPrice)}</span>
                        </div>
                      </div>
                      <span className={`operations-my-requests-status operations-my-requests-status--${String(row.status || '').toLowerCase()}`}>
                        {getRequestStatusLabel(row.status, t)}
                      </span>
                    </article>
                  ))}
              </div>
            )}
          </section>
        )}
      </div>

      {requestTarget && (
        <OperationsRequestModal
          service={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSuccess={(payload) => {
            setRequestTarget(null);
            setRequestSuccess(payload);
            loadMyRequests();
          }}
        />
      )}

      {requestSuccess && (
        <OperationsRequestSuccess
          payload={requestSuccess}
          onClose={() => setRequestSuccess(null)}
        />
      )}

      {detailProfile && (
        <VirtualAssistantPreviewModal
          profile={detailProfile}
          open={!!detailProfile}
          onClose={closeListingDetail}
          hireIntent={hireIntent}
          showShareIcon
        />
      )}
    </AppLayout>
  );
}
