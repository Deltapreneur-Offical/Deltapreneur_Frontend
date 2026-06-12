import { useMemo, useState, useCallback } from 'react';
import {
  Headset, Users, Calculator, Share2, MessageCircle, TrendingUp, Megaphone,
  Code, Server, Layers, ClipboardList, Search as SearchIcon, Palette, Film, Database, Briefcase,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import FilterBar from '../components/common/FilterBar';

const CATEGORY_OPTIONS = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'technology', label: 'Developers' },
  { value: 'sales', label: 'Sales' },
  { value: 'finance', label: 'Finance' },
  { value: 'people', label: 'People & HR' },
  { value: 'support', label: 'Support' },
  { value: 'creative', label: 'Creative' },
  { value: 'growth', label: 'Growth' },
  { value: 'operations', label: 'Operations' },
];

const SERVICES = [
  { title: 'Virtual HR Manager', price: 18999, icon: Users, category: 'people', keywords: 'hr people hiring recruitment' },
  { title: 'Virtual Accountant', price: 22999, icon: Calculator, category: 'finance', keywords: 'accounting finance books' },
  { title: 'Virtual Social Media Manager', price: 14999, icon: Share2, category: 'marketing', keywords: 'social media instagram linkedin' },
  { title: 'Virtual Customer Support Executive', price: 11999, icon: MessageCircle, category: 'support', keywords: 'customer support helpdesk' },
  { title: 'Virtual Sales Representative', price: 15999, icon: TrendingUp, category: 'sales', keywords: 'sales leads outbound' },
  { title: 'Virtual Digital Marketing Executive', price: 17999, icon: Megaphone, category: 'marketing', keywords: 'digital marketing ads campaigns' },
  { title: 'Virtual Frontend Developer', price: 34999, icon: Code, category: 'technology', keywords: 'frontend react developer web' },
  { title: 'Virtual Backend Developer', price: 34999, icon: Server, category: 'technology', keywords: 'backend api developer java node' },
  { title: 'Virtual Full Stack Developer', price: 44999, icon: Layers, category: 'technology', keywords: 'full stack developer web app' },
  { title: 'Virtual Admin Assistant', price: 9999, icon: ClipboardList, category: 'operations', keywords: 'admin assistant operations' },
  { title: 'Virtual SEO Specialist', price: 16999, icon: SearchIcon, category: 'marketing', keywords: 'seo search ranking google' },
  { title: 'Virtual Graphic Designer', price: 15499, icon: Palette, category: 'creative', keywords: 'graphic design branding' },
  { title: 'Virtual Video Editor', price: 17499, icon: Film, category: 'creative', keywords: 'video editing reels youtube' },
  { title: 'Virtual CRM Specialist', price: 14499, icon: Database, category: 'sales', keywords: 'crm hubspot salesforce pipeline' },
  { title: 'Virtual Business Development Executive', price: 18499, icon: Briefcase, category: 'growth', keywords: 'business development partnerships growth' },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));

function formatInr(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function OperationsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');

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
    let result = SERVICES.filter((s) => {
      if (category && s.category !== category) return false;
      if (minPrice !== '' && s.price < Number(minPrice)) return false;
      if (maxPrice !== '' && s.price > Number(maxPrice)) return false;
      if (!q) return true;
      return `${s.title} ${s.keywords} ${s.category}`.toLowerCase().includes(q);
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
      return a.price - b.price;
    });

    return result;
  }, [search, category, minPrice, maxPrice, sortBy]);

  const isFiltered = activeFilterCount > 0;
  const roleCountLabel = isFiltered
    ? t('operationsRolesShowing', { count: filtered.length, total: SERVICES.length, defaultValue: '{{count}} of {{total}} Roles' })
    : t('operationsRolesAvailable', { count: SERVICES.length, defaultValue: '{{count}} Virtual Roles Available' });

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 min-w-0">
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 px-5 py-5 sm:px-7 sm:py-6 text-white">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                <Headset size={22} strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-0.5">
                  {t('operationsEyebrow', { defaultValue: 'Virtual Assistant Services' })}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {t('operationsTitle', { defaultValue: 'Operations' })}
                </h1>
                <p className="mt-1.5 text-sm text-white/75 max-w-xl leading-relaxed">
                  {t('operationsSubtitle', {
                    defaultValue: 'Hire skilled virtual professionals to run HR, finance, marketing, tech, and day-to-day operations.',
                  })}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
                {t('operationsFindHeading', { defaultValue: 'Find Your Virtual Expert' })}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {t('operationsFindSubtitle', { defaultValue: 'Hire experienced professionals without full-time overhead.' })}
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
            categoryOptions={CATEGORY_OPTIONS}
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

          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 bg-white">
              <p className="text-base font-semibold text-gray-900 mb-1">
                {t('operationsEmptyTitle', { defaultValue: 'No roles match your search' })}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {t('operationsEmptyBody', { defaultValue: 'Try a different keyword or clear your filters.' })}
              </p>
              <button type="button" onClick={clearAll} className="btn-glow text-sm px-5 py-2">
                {t('operationsClearFilters', { defaultValue: 'Clear filters' })}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
              {filtered.map((service) => {
                const Icon = service.icon;
                const catLabel = CATEGORY_LABELS[service.category] ?? service.category;
                return (
                  <article
                    key={service.title}
                    className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2.5 mb-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                        <Icon size={18} strokeWidth={2} aria-hidden />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {catLabel}
                      </span>
                    </div>
                    <h3 className="font-display text-[15px] font-semibold text-gray-900 leading-snug mb-1.5">
                      {service.title}
                    </h3>
                    <p className="text-xs text-gray-500 flex-1 leading-relaxed">
                      {t('operationsCardDesc', { defaultValue: 'Dedicated remote professional for your MSME — flexible monthly engagement.' })}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5 font-medium">
                          {t('operationsFrom', { defaultValue: 'Starting at' })}
                        </p>
                        <p className="text-base font-bold text-gray-900">
                          {formatInr(service.price)}
                          <span className="text-xs font-medium text-gray-400">/mo</span>
                        </p>
                      </div>
                      <button type="button" className="btn-glow shrink-0 text-xs px-3.5 py-1.5" onClick={() => {}}>
                        {t('operationsHire', { defaultValue: 'Hire' })} →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
