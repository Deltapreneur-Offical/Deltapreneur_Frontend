import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStaticHubRegistrarCategories } from '../../utils/operationsCategories';
import { REGISTRATIONS_PAGE_PATH } from '../../utils/operationsSections';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import HomeRegistrationCategoryCard from './HomeRegistrationCategoryCard';

const VIEW_ALL_PATH = REGISTRATIONS_PAGE_PATH;
const EMPTY_MESSAGE = 'No category found. Check back soon, we are working on it.';
const ALL_CATEGORIES = getStaticHubRegistrarCategories();

export default function HomeRegistrationsSection() {
  const [categoryFilter, setCategoryFilter] = useState('');

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

  const shouldAutoScroll = useShouldAutoScroll(filteredCategories.length);

  return (
    <section className="bg-white pt-3 pb-4 md:pt-4 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <header className="home-section-header home-section-header--domain">
          <div className="home-section-header__top">
            <h2 className="home-section-header__title">Registrations</h2>
            <div className="hro-header-right">
              <div className="hro-city-filter-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-city-filter-icon">
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="hro-city-filter-input"
                  placeholder="Search with Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Search with Category"
                />
                {categoryFilter && (
                  <button
                    type="button"
                    className="hro-city-filter-clear"
                    onClick={() => setCategoryFilter('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <Link to={VIEW_ALL_PATH} className="home-section-header__view-all">
                <span>View All</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="home-section-header__view-all-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </header>

        {filteredCategories.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{EMPTY_MESSAGE}</p>
        ) : shouldAutoScroll ? (
          <HomeAutoScrollRow durationSec={90} ariaLabel="Registrations">
            {filteredCategories.map((category) => (
              <HomeAutoScrollRowItem key={category.slug}>
                <HomeRegistrationCategoryCard category={category} variant="marquee" />
              </HomeAutoScrollRowItem>
            ))}
          </HomeAutoScrollRow>
        ) : (
          <HomePreviewRow>
            {filteredCategories.map((category) => (
              <HomePreviewRowItem key={category.slug}>
                <HomeRegistrationCategoryCard category={category} variant="marquee" />
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
