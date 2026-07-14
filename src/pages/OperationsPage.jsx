import { useMemo, useState, useCallback, useEffect } from 'react';
import { CheckCircle, Headset, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import FilterBar from '../components/common/FilterBar';
import PageContentSkeleton from '../components/common/PageContentSkeleton';
import OperationsRequestModal from '../components/operations/OperationsRequestModal';
import OperationsRequestSuccess from '../components/operations/OperationsRequestSuccess';
import OperationsServiceCard from '../components/operations/OperationsServiceCard';
import OperationsSectionTabs from '../components/operations/OperationsSectionTabs';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { operationsAPI, operationsRequestAPI } from '../api/services';
import { asArray } from '../utils/asArray';
import { OPERATIONS_CATEGORY_LABELS, OPERATIONS_CATEGORY_OPTIONS } from '../utils/operationsCategories';
import { resolveOperationsIcon } from '../utils/operationsIcons';
import { formatOperationsPrice, formatRequestAdminPrice, isComplianceService } from '../utils/operationsPricing';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionId = searchParams.get('section') || 'assistance';
  const activeSection = resolveOperationsSection(sectionId);

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
        const counts = Object.fromEntries(OPERATIONS_SECTIONS.map((section) => [section.id, 0]));
        rows.forEach((row) => {
          const type = row.serviceType || 'virtual_assistance';
          const section = OPERATIONS_SECTIONS.find((s) => s.serviceType === type) || OPERATIONS_SECTIONS[0];
          counts[section.id] += 1;
        });
        setSectionCounts(counts);
      })
      .catch(() => {
        if (!cancelled) setSectionCounts({ assistance: 0, compliance: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
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
  }, [activeSection.serviceType]);

  useEffect(() => {
    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('price_asc');
  }, [activeSection.id]);

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

  const isCompliance = activeSection.id === 'compliance';
  const isFiltered = activeFilterCount > 0;
  const roleCountLabel = isFiltered
    ? t('operationsRolesShowing', { count: filtered.length, total: services.length, defaultValue: '{{count}} of {{total}} Roles' })
    : t(
        isCompliance ? 'operationsComplianceAvailable' : 'operationsRolesAvailable',
        {
          count: services.length,
          defaultValue: isCompliance
            ? '{{count}} Compliance Services Available'
            : '{{count}} Virtual Roles Available',
        },
      );

  const SectionIcon = isCompliance ? ShieldCheck : Headset;

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 min-w-0">
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
                        defaultValue: 'Business compliance, registration support, and regulatory guidance for your venture.',
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
                  ? t('operationsComplianceFindHeading', { defaultValue: 'Find Compliance Support' })
                  : t('operationsFindHeading', { defaultValue: 'Find Your Virtual Expert' })}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {isCompliance
                  ? t('operationsComplianceFindSubtitle', { defaultValue: 'Stay compliant with expert registration and regulatory support.' })
                  : t('operationsFindSubtitle', { defaultValue: 'Hire experienced professionals without full-time overhead.' })}
              </p>
            </div>
            <p className="text-sm text-gray-500 shrink-0">
              <span className="font-medium text-gray-800">{roleCountLabel}</span>
            </p>
          </div>

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
                {isCompliance
                  ? t('operationsComplianceEmptyTitle', { defaultValue: 'No compliance services available yet' })
                  : t('operationsEmptyTitle', { defaultValue: 'No roles match your search' })}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {isCompliance
                  ? t('operationsComplianceEmptyBody', { defaultValue: 'Compliance services will appear here once added by the admin team.' })
                  : t('operationsEmptyBody', { defaultValue: 'Try a different keyword or clear your filters.' })}
              </p>
              {!isCompliance && (
                <button type="button" onClick={clearAll} className="btn-glow text-sm px-5 py-2">
                  {t('operationsClearFilters', { defaultValue: 'Clear filters' })}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
              {filtered.map((service) => (
                <OperationsServiceCard
                  key={service.id}
                  service={service}
                  onHire={() => setRequestTarget(service)}
                />
              ))}
            </div>
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
                  defaultValue: 'Track whether you submitted a hire request or booked a compliance slot.',
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
    </AppLayout>
  );
}
