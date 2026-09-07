import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, ChevronRight, LayoutGrid, Search, ShieldCheck, X } from 'lucide-react';
import TopNavbar from '../components/common/TopNavbar';
import HomeNavbar from '../components/common/HomeNavbar';
import HomeFooter from '../components/common/HomeFooter';
import HomeRegistrationCategoryCard from '../components/home/HomeRegistrationCategoryCard';
import HomeRegistrationServiceCard from '../components/home/HomeRegistrationServiceCard';
import buildingsSkyline from '../assets/buildingssss.png';
import useHomePageScrollNav from '../hooks/useHomePageScrollNav';
import useDocumentMeta from '../hooks/useDocumentMeta';
import {
  getHubRegistrarSubcategories,
  matchServicePriceFromApi,
} from '../utils/operationsCategories';
import { operationsAPI } from '../api/services';
import { asArray } from '../utils/asArray';
import { usePublicHubRegistrarCategories } from '../context/CategoryContext';
import { REGISTRATIONS_PAGE_PATH } from '../utils/operationsSections';
import '../styles/registrations-catalog.css';

/** Map category slugs to i18n translation keys for labels, descriptions, and highlights. */
const REG_CAT_I18N = {
  business_entity: { labelKey: 'regCatBusinessEntity', descKey: 'regCatDescBusinessEntity', highlightsKey: 'regCatHighlightBusinessEntity' },
  tax_identity: { labelKey: 'regCatTaxIdentity', descKey: 'regCatDescTaxIdentity', highlightsKey: 'regCatHighlightTaxIdentity' },
  local_licences: { labelKey: 'regCatLocalLicences', descKey: 'regCatDescLocalLicences', highlightsKey: 'regCatHighlightLocalLicences' },
  msme_udyam: { labelKey: 'regCatMsmeUdyam', descKey: 'regCatDescMsmeUdyam', highlightsKey: 'regCatHighlightMsmeUdyam' },
  startup_dpiit: { labelKey: 'regCatStartupDpiit', descKey: 'regCatDescStartupDpiit', highlightsKey: 'regCatHighlightStartupDpiit' },
  food_fssai: { labelKey: 'regCatFoodFssai', descKey: 'regCatDescFoodFssai', highlightsKey: 'regCatHighlightFoodFssai' },
  import_export: { labelKey: 'regCatImportExport', descKey: 'regCatDescImportExport', highlightsKey: 'regCatHighlightImportExport' },
  manufacturing: { labelKey: 'regCatManufacturing', descKey: 'regCatDescManufacturing', highlightsKey: 'regCatHighlightManufacturing' },
  technology_saas: { labelKey: 'regCatTechnologySaas', descKey: 'regCatDescTechnologySaas', highlightsKey: 'regCatHighlightTechnologySaas' },
  ecommerce: { labelKey: 'regCatEcommerce', descKey: 'regCatDescEcommerce', highlightsKey: 'regCatHighlightEcommerce' },
  fintech: { labelKey: 'regCatFintech', descKey: 'regCatDescFintech', highlightsKey: 'regCatHighlightFintech' },
  aviation: { labelKey: 'regCatAviation', descKey: 'regCatDescAviation', highlightsKey: 'regCatHighlightAviation' },
  construction_real_estate: { labelKey: 'regCatConstructionRealEstate', descKey: 'regCatDescConstructionRealEstate', highlightsKey: 'regCatHighlightConstructionRealEstate' },
  healthcare: { labelKey: 'regCatHealthcare', descKey: 'regCatDescHealthcare', highlightsKey: 'regCatHighlightHealthcare' },
  education: { labelKey: 'regCatEducation', descKey: 'regCatDescEducation', highlightsKey: 'regCatHighlightEducation' },
  professional_services: { labelKey: 'regCatProfessionalServices', descKey: 'regCatDescProfessionalServices', highlightsKey: 'regCatHighlightProfessionalServices' },
  telecom: { labelKey: 'regCatTelecom', descKey: 'regCatDescTelecom', highlightsKey: 'regCatHighlightTelecom' },
  pharma_chemical: { labelKey: 'regCatPharmaChemical', descKey: 'regCatDescPharmaChemical', highlightsKey: 'regCatHighlightPharmaChemical' },
  automotive: { labelKey: 'regCatAutomotive', descKey: 'regCatDescAutomotive', highlightsKey: 'regCatHighlightAutomotive' },
  agriculture: { labelKey: 'regCatAgriculture', descKey: 'regCatDescAgriculture', highlightsKey: 'regCatHighlightAgriculture' },
  logistics_transport: { labelKey: 'regCatLogisticsTransport', descKey: 'regCatDescLogisticsTransport', highlightsKey: 'regCatHighlightLogisticsTransport' },
  tourism_hospitality: { labelKey: 'regCatTourismHospitality', descKey: 'regCatDescTourismHospitality', highlightsKey: 'regCatHighlightTourismHospitality' },
  entertainment_media: { labelKey: 'regCatEntertainmentMedia', descKey: 'regCatDescEntertainmentMedia', highlightsKey: 'regCatHighlightEntertainmentMedia' },
  energy_power: { labelKey: 'regCatEnergyPower', descKey: 'regCatDescEnergyPower', highlightsKey: 'regCatHighlightEnergyPower' },
  defence_aerospace: { labelKey: 'regCatDefenceAerospace', descKey: 'regCatDescDefenceAerospace', highlightsKey: 'regCatHighlightDefenceAerospace' },
  intellectual_property: { labelKey: 'regCatIntellectualProperty', descKey: 'regCatDescIntellectualProperty', highlightsKey: 'regCatHighlightIntellectualProperty' },
  employer_labour: { labelKey: 'regCatEmployerLabour', descKey: 'regCatDescEmployerLabour', highlightsKey: 'regCatHighlightEmployerLabour' },
  environmental: { labelKey: 'regCatEnvironmental', descKey: 'regCatDescEnvironmental', highlightsKey: 'regCatHighlightEnvironmental' },
  digital_services: { labelKey: 'regCatDigitalServices', descKey: 'regCatDescDigitalServices', highlightsKey: 'regCatHighlightDigitalServices' },
};

export default function RegistrationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [apiServices, setApiServices] = useState([]);
  const { categories: allCategories, fetched: categoriesReady } = usePublicHubRegistrarCategories();
  const { isScrolled, navRef } = useHomePageScrollNav();

  // Fetch operations services from backend (single source of truth for prices)
  useEffect(() => {
    let cancelled = false;
    operationsAPI
      .list({ serviceType: 'compliance' })
      .then(({ data }) => {
        if (!cancelled) setApiServices(asArray(data));
      })
      .catch(() => {
        if (!cancelled) setApiServices([]);
      });
    return () => { cancelled = true; };
  }, []);

  const selectedSlug = searchParams.get('category') || '';

  // Scroll to top when the selected category changes so the destination
  // page always starts at the top instead of preserving the old scroll position.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedSlug]);

  // Merge API category data with i18n translations.
  // API data (from admin) is the source of truth for name/description/price.
  // i18n is used only for highlights (which the API doesn't provide).
  const translatedCategories = useMemo(() => (
    allCategories.map((cat) => {
      const i18n = REG_CAT_I18N[cat.slug];
      const highlights = (cat.highlights && cat.highlights.length > 0)
        ? cat.highlights
        : i18n
          ? Array.from({ length: 3 }, (_, idx) => t(`${i18n.highlightsKey}${idx}`, ''))
              .filter(Boolean)
          : [];
      return {
        ...cat,
        // Use API values as-is (admin-managed, source of truth)
        label: cat.label,
        description: cat.description,
        highlights,
      };
    })
  ), [t, allCategories]);

  const selectedCategory = useMemo(
    () => translatedCategories.find((row) => row.slug === selectedSlug) || null,
    [selectedSlug, translatedCategories],
  );
  const showingServices = Boolean(selectedCategory);
  const services = useMemo(
    () => {
      if (!selectedCategory) return [];
      const subs = getHubRegistrarSubcategories(selectedCategory.slug);
      if (apiServices.length === 0) return subs;
      return subs.map((sub) => {
        const match = matchServicePriceFromApi(sub, apiServices);
        return match ? { ...sub, price: match.price, governmentFeesApplicable: match.governmentFeesApplicable, governmentFeeText: match.governmentFeeText } : sub;
      });
    },
    [selectedCategory, apiServices],
  );

  useDocumentMeta({
    title: selectedCategory
      ? `${selectedCategory.label} | Deltapreneur`
      : 'Registrations | Deltapreneur',
    description:
      'Browse Delta Registrations categories — from business entity and GST to FSSAI, MSME, aviation, and industry licences — then open the services that apply.',
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      const target = e.target;
      if (navRef.current?.contains(target)) return;
      if (target.closest?.('[data-home-nav-dropdown]')) return;
      setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [navRef]);

  useEffect(() => {
    setCategoryFilter('');
  }, [selectedSlug]);

  useEffect(() => {
    // Wait until the public category list has settled so a homepage click
    // is not stripped before the matching slug arrives from the API.
    if (!categoriesReady) return;
    if (selectedSlug && !selectedCategory) {
      setSearchParams({}, { replace: true });
    }
  }, [selectedSlug, selectedCategory, setSearchParams, categoriesReady]);

  const filteredCategories = useMemo(() => {
    const query = categoryFilter.trim().toLowerCase();
    if (!query) return translatedCategories;
    return translatedCategories.filter((category) => (
      category.label.toLowerCase().includes(query)
      || category.slug.toLowerCase().includes(query)
      || (category.description || '').toLowerCase().includes(query)
      || (category.highlights || []).some((point) => point.toLowerCase().includes(query))
    ));
  }, [categoryFilter, translatedCategories]);

  const filteredServices = useMemo(() => {
    const query = categoryFilter.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) => (
      service.label.toLowerCase().includes(query)
      || service.slug.toLowerCase().includes(query)
    ));
  }, [categoryFilter, services]);

  const goBackToCategories = () => {
    navigate(REGISTRATIONS_PAGE_PATH);
  };

  const visibleItems = showingServices ? filteredServices : filteredCategories;
  const emptyMessage = showingServices ? t('regCatalogEmptyService') : t('regCatalogEmptyCategory');

  return (
    <div className="relative min-w-0 bg-white overflow-visible">
      <TopNavbar homeMobileMenu hideContactUs isScrolled={isScrolled} />
      <HomeNavbar
        navRef={navRef}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        navigate={navigate}
        showBack
        backVariant="professional"
        isScrolled={isScrolled}
      />

      <div className="reg-catalog-shell">
        <section className={showingServices ? 'reg-catalog-hero reg-catalog-hero--service' : 'reg-catalog-hero reg-catalog-hero--browse'}>
        <div className="reg-catalog-hero-inner">
          <div className={showingServices ? undefined : 'reg-catalog-hero-main'}>
          <div className="reg-catalog-hero-copy">
            <p className="reg-catalog-kicker">
              {t('regCatalogKicker', { defaultValue: 'Delta Registrations' })}
            </p>
            <h1 className="reg-catalog-title">
              {showingServices ? selectedCategory.label : (
                <>
                  <span className="reg-catalog-title__lead">
                    {t('regCatalogHeroTitle')}
                  </span>
                  <span className="reg-catalog-title__accent">
                    {t('regCatalogHeroTitleAccent')}
                  </span>
                </>
              )}
            </h1>
            <p className="reg-catalog-lead">
              {showingServices
                ? (selectedCategory.description || t('regCatalogHeroDescService'))
                : t('regCatalogHeroDesc')}
            </p>
          </div>

          <div className="reg-catalog-hero-tools">
            <div className={showingServices ? 'reg-catalog-search' : 'reg-catalog-search reg-catalog-search--browse'}>
              <Search className="reg-catalog-search__icon" size={18} strokeWidth={2} aria-hidden />
              <input
                type="text"
                className="reg-catalog-search__input"
                placeholder={showingServices ? t('regCatalogSearchServices') : t('regCatalogSearchCategories')}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label={showingServices ? t('regCatalogSearchServices') : t('regCatalogSearchCategories')}
                autoComplete="off"
                spellCheck="false"
              />
              {categoryFilter.trim() ? (
                <button
                  type="button"
                  className="reg-catalog-search__clear"
                  onClick={() => setCategoryFilter('')}
                  aria-label={t('regCatalogClearSearch')}
                >
                  <X size={14} strokeWidth={2.25} aria-hidden />
                </button>
              ) : null}
              {!showingServices ? (
                <button
                  type="button"
                  className="reg-catalog-search__go"
                  onClick={() => document.getElementById('reg-catalog-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  aria-label={t('regCatalogSearchCategories')}
                >
                  <Search size={16} strokeWidth={2.5} aria-hidden />
                </button>
              ) : null}
            </div>
            {showingServices ? (
              <p className="reg-catalog-hero-count">
                {filteredServices.length}{' '}
                {filteredServices.length === 1 ? t('regCatalogCountService') : t('regCatalogCountServices')}
              </p>
            ) : null}
          </div>
          </div>

          {!showingServices ? (
            <aside className="reg-catalog-hero-aside" aria-label={t('regCatalogStatCategories')}>
              <div className="reg-catalog-float">
                <div className="reg-catalog-float__body">
                  <p className="reg-catalog-float__eyebrow">
                    {t('regCatalogKicker', { defaultValue: 'Delta Registrations' })}
                  </p>
                  <ul className="reg-catalog-float__list">
                    <li className="reg-catalog-float__row">
                      <div className="reg-catalog-float__icon reg-catalog-float__icon--saffron" aria-hidden>
                        <LayoutGrid size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>{allCategories.length} {t('regCatalogStatCategories')}</strong>
                        <span>{t('regCatalogFloatCatDesc', { defaultValue: 'A wide range of categories to choose from.' })}</span>
                      </div>
                      <ChevronRight className="reg-catalog-float__chevron" size={18} strokeWidth={2.25} aria-hidden />
                    </li>
                    <li className="reg-catalog-float__row">
                      <div className="reg-catalog-float__icon reg-catalog-float__icon--amber" aria-hidden>
                        <Building2 size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>{t('regCatalogStatIndiaWide')} {t('regCatalogStatEntityIndustry')}</strong>
                        <span>{t('regCatalogFloatIndiaDesc', { defaultValue: 'Services and registrations across the country.' })}</span>
                      </div>
                      <ChevronRight className="reg-catalog-float__chevron" size={18} strokeWidth={2.25} aria-hidden />
                    </li>
                    <li className="reg-catalog-float__row">
                      <div className="reg-catalog-float__icon reg-catalog-float__icon--teal" aria-hidden>
                        <ShieldCheck size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <strong>{t('regCatalogStatGuided')} {t('regCatalogStatOpenMatching')}</strong>
                        <span>{t('regCatalogFloatGuidedDesc', { defaultValue: 'Find the right service with smart guidance.' })}</span>
                      </div>
                      <ChevronRight className="reg-catalog-float__chevron" size={18} strokeWidth={2.25} aria-hidden />
                    </li>
                  </ul>
                </div>
                <div className="reg-catalog-float__skyline">
                  <img src={buildingsSkyline} alt="" />
                </div>
              </div>
            </aside>
          ) : null}
        </div>
        </section>

      <div className="home-hero-align-outer reg-catalog-body" id="reg-catalog-results">
        <div className="home-hero-align-inner">
          <div className="reg-catalog-toolbar">
            <div>
              {showingServices ? (
                <button type="button" className="reg-catalog-back" onClick={goBackToCategories}>
                  <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
                  {t('regCatalogBackToCategories')}
                </button>
              ) : null}
              <h2 className="reg-catalog-section-title">
                {showingServices ? t('regCatalogBrowseServices') : t('regCatalogBrowseCategories')}
              </h2>
              <p className="reg-catalog-count">
                {visibleItems.length}{' '}
                {showingServices
                  ? (visibleItems.length === 1 ? t('regCatalogCountService') : t('regCatalogCountServices'))
                  : (visibleItems.length === 1 ? t('regCatalogCountCategory') : t('regCatalogCountCategories'))}
              </p>
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="reg-catalog-empty">{emptyMessage}</div>
          ) : showingServices ? (
            <div className="reg-catalog-grid reg-catalog-grid--services">
              {filteredServices.map((service) => (
                <HomeRegistrationServiceCard
                  key={service.slug}
                  categorySlug={selectedCategory.slug}
                  service={service}
                />
              ))}
            </div>
          ) : (
            <div className="reg-catalog-grid">
              {filteredCategories.map((category) => (
                <HomeRegistrationCategoryCard
                  key={category.slug}
                  category={category}
                  variant="catalog"
                />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      <HomeFooter />
    </div>
  );
}
