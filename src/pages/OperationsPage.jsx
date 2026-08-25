import { useMemo, useState, useCallback, useEffect } from 'react';
import { Headset, Building2, ShieldCheck } from 'lucide-react';
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
import HubRegistrarOfficeCard from '../components/listings/HubRegistrarOfficeCard';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { operationsAPI, operationsRequestAPI, virtualAssistantAPI, hubRegistrarOfficeAPI } from '../api/services';
import { asArray } from '../utils/asArray';
import { unwrapApiData } from '../utils/apiResponse';
import { OPERATIONS_CATEGORY_OPTIONS, getHubRegistrarFilterCategoryOptions } from '../utils/operationsCategories';
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionId = searchParams.get('section') || 'assistance';
  const activeSection = resolveOperationsSection(sectionId);
  const hireIntent = searchParams.get('intent') === 'hire';

  const [services, setServices] = useState([]);
  const [sectionCounts, setSectionCounts] = useState({ assistance: 0, compliance: 0, offices: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
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

  const scrollToMyRequests = useCallback(() => {
    document.getElementById('operations-my-requests')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  useEffect(() => {
    if (location.hash !== '#operations-my-requests') return undefined;
    const timer = window.setTimeout(scrollToMyRequests, 120);
    return () => window.clearTimeout(timer);
  }, [location.hash, myRequestsLoading, user, scrollToMyRequests]);

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
  const isOffices = activeSection.id === 'offices';

  const [offices, setOffices] = useState([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [officeCityFilter, setOfficeCityFilter] = useState('');

  const loadOffices = useCallback(async () => {
    setOfficesLoading(true);
    try {
      const response = await hubRegistrarOfficeAPI.list();
      setOffices(response.data.data || []);
    } catch (error) {
      console.error('Failed to load offices:', error);
      setOffices([]);
    } finally {
      setOfficesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOffices) {
      loadOffices();
    }
  }, [isOffices, loadOffices]);
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
    setSectionCounts((prev) => ({ ...prev, assistance: featuredVaCount, offices: offices.length }));
  }, [featuredVaCount, offices.length]);

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
    setMinPrice('');
    setMaxPrice('');
    setSortBy('price_asc');
    if (!isCompliance) setCategory('');
  }, [activeSection.id, isAssistance, isCompliance]);

  const categoryFromUrl = searchParams.get('category') || '';

  useEffect(() => {
    if (!isCompliance) return;
    setCategory(categoryFromUrl);
  }, [isCompliance, categoryFromUrl]);

  const setSection = (nextSectionId) => {
    setSearchParams({ section: nextSectionId }, { replace: true });
  };

  const handleCategoryChange = useCallback((nextCategory) => {
    setCategory(nextCategory);
    if (!isCompliance) return;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('section', 'compliance');
      if (nextCategory) params.set('category', nextCategory);
      else params.delete('category');
      return params;
    }, { replace: true });
  }, [isCompliance, setSearchParams]);

  const categoryOptions = useMemo(() => {
    if (isCompliance) {
      return getHubRegistrarFilterCategoryOptions(services);
    }
    const present = new Set(services.map((s) => s.category).filter(Boolean));
    return OPERATIONS_CATEGORY_OPTIONS.filter((opt) => present.has(opt.value));
  }, [services, isCompliance]);

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
    if (isCompliance) {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('category');
        return params;
      }, { replace: true });
    }
  }, [isCompliance, setSearchParams]);

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
  const roleCountLabel = isOffices
    ? t('operationsRolesAvailable', { count: offices.length, defaultValue: '{{count}} offices available' })
    : isAssistance
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
            ? '{{count}} Hub Registrar Available'
            : '{{count}} Virtual Roles Available',
        },
      );

  const SectionIcon = isCompliance ? ShieldCheck : Building2;

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
                  {isOffices
                    ? t('operationsSectionOfficesHint', { defaultValue: 'Find your nearest Hub Registrar office for in-person support.' })
                    : isCompliance
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
                {isOffices
                  ? 'Hub Registrar Offices'
                  : isCompliance
                  ? t('operationsComplianceFindHeading', { defaultValue: 'Find Hub Registrar' })
                  : t('operationsFeaturedVaHeading', { defaultValue: 'Featured Virtual Assistants' })}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {isOffices
                  ? t('operationsSectionOfficesHint', { defaultValue: 'Find your nearest Hub Registrar office for in-person support.' })
                  : isCompliance
                  ? t('operationsComplianceFindSubtitle', { defaultValue: 'Expert registration and hub registrar support for your venture.' })
                  : t('operationsFeaturedVaSubtitle', {
                      defaultValue: 'Published virtual assistants selected for the homepage and operations showcase.',
                    })}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {isOffices && (
                <div className="hro-city-filter-wrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-city-filter-icon">
                    <circle cx="11" cy="11" r="8"/>
                    <path strokeLinecap="round" d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    className="hro-city-filter-input"
                    placeholder="Search by city..."
                    value={officeCityFilter}
                    onChange={(e) => setOfficeCityFilter(e.target.value)}
                  />
                  {officeCityFilter && (
                    <button
                      type="button"
                      className="hro-city-filter-clear"
                      onClick={() => setOfficeCityFilter('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-800">{roleCountLabel}</span>
              </p>
            </div>
          </div>

          {/* HIDDEN — Virtual Assistance content temporarily disabled
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
          */}
          {isOffices ? (
            officesLoading ? (
              <PageContentSkeleton variant="grid" rows={3} />
            ) : offices.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 bg-white">
                <p className="text-base font-semibold text-gray-900 mb-1">
                  No offices available yet
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Hub Registrar offices will appear here once added by the admin team.
                </p>
              </div>
            ) : (() => {
              const filteredOffices = offices.filter((office) => {
                if (!officeCityFilter.trim()) return true;
                const searchTerm = officeCityFilter.toLowerCase();
                return (
                  (office.city && office.city.toLowerCase().includes(searchTerm)) ||
                  (office.full_address && office.full_address.toLowerCase().includes(searchTerm)) );
              });

              if (filteredOffices.length === 0) {
                return (
                  <div className="hro-no-results">
                    <div className="hro-no-results-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="hro-no-results-title">
                      No offices found in "{officeCityFilter}"
                    </p>
                    <p className="hro-no-results-desc">
                      We will be coming to that city soon! Try searching for a different city.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
                  {filteredOffices.map((office) => (
                    <HubRegistrarOfficeCard key={office.id} office={office} />
                  ))}
                </div>
              );
            })()
          ) : (
            <>
              <FilterBar
                search={search}
                onSearch={setSearch}
                category={category}
                onCategory={isCompliance ? handleCategoryChange : setCategory}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
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

        {/* Quick Actions — Hub Registrar & Offices section only */}
        {isOffices && (
          <section className="hro-quick-actions">
            <div className="mb-3">
              <h2 className="font-display text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
                Quick Actions
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Quick ways to connect with Hub Registrar offices.
              </p>
            </div>

            <div className="hro-quick-actions-grid">
              <button
                type="button"
                className="hro-quick-action-card hro-quick-action-find"
                onClick={() => {
                  const section = document.querySelector('.hro-card');
                  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <div className="hro-quick-action-icon hro-quick-action-icon-find">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="hro-quick-action-content">
                  <span className="hro-quick-action-title">Find Nearest Office</span>
                  <span className="hro-quick-action-desc">Browse all available offices</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-quick-action-arrow">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                className="hro-quick-action-card hro-quick-action-call"
                onClick={() => window.open('tel:+919876543210', '_self')}
              >
                <div className="hro-quick-action-icon hro-quick-action-icon-call">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="hro-quick-action-content">
                  <span className="hro-quick-action-title">Call Support</span>
                  <span className="hro-quick-action-desc">Speak with our team</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-quick-action-arrow">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                className="hro-quick-action-card hro-quick-action-report"
                onClick={() => {
                  alert('Report an Issue feature coming soon!');
                }}
              >
                <div className="hro-quick-action-icon hro-quick-action-icon-report">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.753-2.5-2.599-4.5L9.4 3.004zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="hro-quick-action-content">
                  <span className="hro-quick-action-title">Report an Issue</span>
                  <span className="hro-quick-action-desc">Coming soon</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-quick-action-arrow">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>
        )}

        {/* My Requests — Virtual Assistance & Hub Registrar sections only (not Offices) */}
        {user && !isOffices && (
          <section id="operations-my-requests" className="operations-my-requests">
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
          onTrack={() => {
            setRequestSuccess(null);
            window.setTimeout(scrollToMyRequests, 60);
          }}
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
