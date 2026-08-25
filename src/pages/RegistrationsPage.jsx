import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, Building2, Scale, Sparkles, X } from 'lucide-react';
import TopNavbar from '../components/common/TopNavbar';
import HomeNavbar from '../components/common/HomeNavbar';
import HomeFooter from '../components/common/HomeFooter';
import HomeRegistrationCategoryCard from '../components/home/HomeRegistrationCategoryCard';
import useHomePageScrollNav from '../hooks/useHomePageScrollNav';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { getStaticHubRegistrarCategories } from '../utils/operationsCategories';
import '../styles/registrations-catalog.css';

const ALL_CATEGORIES = getStaticHubRegistrarCategories();
const EMPTY_MESSAGE = 'No category found. Check back soon, we are working on it.';

export default function RegistrationsPage() {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const { isScrolled, navRef } = useHomePageScrollNav();

  useDocumentMeta({
    title: 'Registrations | HubRegistrar',
    description:
      'Browse Hub Registrar categories — from business entity and GST to FSSAI, MSME, aviation, and industry licences — then open the services that apply.',
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

  const filteredCategories = useMemo(() => {
    const query = categoryFilter.trim().toLowerCase();
    if (!query) return ALL_CATEGORIES;
    return ALL_CATEGORIES.filter((category) => (
      category.label.toLowerCase().includes(query)
      || category.slug.toLowerCase().includes(query)
      || (category.description || '').toLowerCase().includes(query)
      || (category.highlights || []).some((point) => point.toLowerCase().includes(query))
    ));
  }, [categoryFilter]);

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

      <section className="reg-catalog-hero">
        <div className="pointer-events-none absolute inset-0 z-0 glow-layer" aria-hidden />
        <div className="reg-catalog-hero-orb reg-catalog-hero-orb--tr" aria-hidden />
        <div className="reg-catalog-hero-orb reg-catalog-hero-orb--bl" aria-hidden />
        <div className="reg-catalog-hero-dots" aria-hidden />

        <div className="reg-catalog-hero-inner">
          <p className="reg-catalog-kicker">
            <Sparkles size={13} strokeWidth={2.4} aria-hidden />
            Hub Registrar
          </p>
          <h1 className="reg-catalog-title">
            Every registration category,
            <span> mapped for Indian business.</span>
          </h1>
          <p className="reg-catalog-lead">
            From a street food cart to aviation, manufacturing, startups, and enterprises.
            Choose a category to open Hub Registrar services that apply.
          </p>

          <div className="reg-catalog-search">
            <Search className="reg-catalog-search__icon" size={18} strokeWidth={2} aria-hidden />
            <input
              type="text"
              className="reg-catalog-search__input"
              placeholder="Search with Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Search with Category"
              autoComplete="off"
              spellCheck="false"
            />
            {categoryFilter.trim() ? (
              <button
                type="button"
                className="reg-catalog-search__clear"
                onClick={() => setCategoryFilter('')}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="reg-catalog-stats">
            <div className="reg-catalog-stat">
              <Building2 size={18} strokeWidth={2} aria-hidden />
              <div>
                <strong>{ALL_CATEGORIES.length}</strong>
                <span>Categories</span>
              </div>
            </div>
            <div className="reg-catalog-stat">
              <Scale size={18} strokeWidth={2} aria-hidden />
              <div>
                <strong>India-wide</strong>
                <span>Entity to industry</span>
              </div>
            </div>
            <div className="reg-catalog-stat">
              <ShieldCheck size={18} strokeWidth={2} aria-hidden />
              <div>
                <strong>Guided</strong>
                <span>Open matching services</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="home-hero-align-outer">
        <div className="home-hero-align-inner">
          <div className="reg-catalog-toolbar">
            <div>
              <h2 className="reg-catalog-section-title">Browse categories</h2>
              <p className="reg-catalog-count">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
              </p>
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="reg-catalog-empty">{EMPTY_MESSAGE}</div>
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

      <HomeFooter />
    </div>
  );
}
