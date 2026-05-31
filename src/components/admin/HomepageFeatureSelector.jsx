import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { adminAPI } from '../../api/services';
import { isActiveListing, isHomepageFeaturedListing } from '../../utils/homepageListings';
import { asArray } from '../../utils/asArray';

const SECTION_LABELS = {
  domain: 'Featured Domains',
  venture: 'Featured Ventures',
  software: 'Featured Software',
  community: 'Featured Creators',
};

const EMPTY_LABELS = {
  domain: 'domains',
  venture: 'ventures',
  software: 'software',
  community: 'communities',
};

const PAGE_SIZES = [25, 50, 100];

function getTitle(item, type) {
  if (type === 'domain') return `${item.domainName || ''}${item.domainExtension || ''}`;
  if (type === 'venture') return item.brandDetails?.brandName || `Venture #${item.id}`;
  if (type === 'software') return item.name || `Software #${item.id}`;
  if (type === 'community') return item.name || `Creator #${item.id}`;
  return '';
}

function FeaturedSwitch({ active, disabled, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? 'Remove from homepage featured' : 'Add to homepage featured'}
      disabled={disabled}
      onClick={onToggle}
      className={`admin-feature-switch ${active ? 'is-on' : ''} ${disabled ? 'is-busy' : ''}`}
    >
      <span className="admin-feature-switch-track">
        <span className="admin-feature-switch-thumb" />
      </span>
      <span className="admin-feature-switch-text">{active ? 'Featured' : 'Feature'}</span>
    </button>
  );
}

export default function HomepageFeatureSelector({ type }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [togglingId, setTogglingId] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let response;
      if (type === 'domain') response = await adminAPI.getDomains();
      else if (type === 'venture') response = await adminAPI.getVentures();
      else if (type === 'software') response = await adminAPI.getSoftwares();
      else if (type === 'community') response = await adminAPI.getCommunities();

      setItems(asArray(response.data));
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy, pageSize, type]);

  const featureableItems = useMemo(
    () => items.filter((item) => isActiveListing(item, type)),
    [items, type],
  );

  const featuredCount = useMemo(
    () => featureableItems.filter((item) => isHomepageFeaturedListing(item, type)).length,
    [featureableItems, type],
  );

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = featureableItems.filter((item) => {
      const featured = Boolean(item.featured);
      if (statusFilter === 'featured' && !featured) return false;
      if (statusFilter === 'unfeatured' && featured) return false;

      if (!q) return true;
      const title = getTitle(item, type).toLowerCase();
      const idStr = String(item.id ?? '');
      return title.includes(q) || idStr.includes(q);
    });

    list.sort((a, b) => {
      const titleA = getTitle(a, type).toLowerCase();
      const titleB = getTitle(b, type).toLowerCase();

      switch (sortBy) {
        case 'name-desc':
          return titleB.localeCompare(titleA);
        case 'id-asc':
          return (a.id ?? 0) - (b.id ?? 0);
        case 'id-desc':
          return (b.id ?? 0) - (a.id ?? 0);
        case 'featured-first':
          return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || titleA.localeCompare(titleB);
        case 'name-asc':
        default:
          return titleA.localeCompare(titleB);
      }
    });

    return list;
  }, [featureableItems, search, statusFilter, sortBy, type]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, safePage, pageSize]);

  const rangeStart = filteredSorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filteredSorted.length);

  const handleToggle = async (id, currentFeatured) => {
    if (togglingId != null) return;
    setTogglingId(id);
    try {
      const typeMap = {
        domain: 'DOMAIN',
        venture: 'VENTURE',
        software: 'SOFTWARE',
        community: 'COMMUNITY',
      };
      await adminAPI.toggleFeatured(typeMap[type], id, !currentFeatured);
      await fetchItems();
    } catch (error) {
      console.error('Failed to toggle homepage feature:', error);
      alert('Failed to update homepage feature status');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-feature-card admin-feature-card--loading">
        <div className="admin-feature-spinner" />
        <p className="admin-feature-loading-text">Loading {EMPTY_LABELS[type]}…</p>
      </div>
    );
  }

  return (
    <div className="admin-feature-card">
      <div className="admin-feature-card-head">
        <div className="admin-feature-card-head-main">
          <h3 className="admin-feature-card-title">{SECTION_LABELS[type]}</h3>
          <p className="admin-feature-card-subtitle">
            Toggle which active listings appear in the homepage row. Admin and user listings can both be featured.
          </p>
        </div>
        <div className="admin-feature-stats">
          <span className="admin-feature-stat">
            <Star size={14} className="admin-feature-stat-icon" aria-hidden />
            {featuredCount} featured
          </span>
          <span className="admin-feature-stat admin-feature-stat--muted">
            {featureableItems.length} total
          </span>
        </div>
      </div>

      <div className="admin-feature-toolbar">
        <div className="admin-feature-search-wrap">
          <Search size={16} className="admin-feature-search-icon" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${EMPTY_LABELS[type]}…`}
            className="admin-feature-search"
            aria-label={`Search ${EMPTY_LABELS[type]}`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-feature-select"
          aria-label="Filter by featured status"
        >
          <option value="all">All status</option>
          <option value="featured">Featured only</option>
          <option value="unfeatured">Not featured</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="admin-feature-select"
          aria-label="Sort list"
        >
          <option value="name-asc">Name A → Z</option>
          <option value="name-desc">Name Z → A</option>
          <option value="id-asc">ID low → high</option>
          <option value="id-desc">ID high → low</option>
          <option value="featured-first">Featured first</option>
        </select>

        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="admin-feature-select admin-feature-select--compact"
          aria-label="Items per page"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      </div>

      {featureableItems.length === 0 ? (
        <p className="admin-feature-empty">No active {EMPTY_LABELS[type]} available to feature</p>
      ) : filteredSorted.length === 0 ? (
        <p className="admin-feature-empty">No matches for your search or filters.</p>
      ) : (
        <>
          <ul className="admin-feature-list" aria-live="polite">
            {paginated.map((item) => {
              const featured = Boolean(item.featured);
              const busy = togglingId === item.id;
              return (
                <li
                  key={item.id}
                  className={`admin-feature-row ${featured ? 'is-featured' : ''} ${busy ? 'is-busy' : ''}`}
                >
                  <div className="admin-feature-row-body">
                    <p className="admin-feature-item-title">{getTitle(item, type)}</p>
                    <p className="admin-feature-item-meta">ID: {item.id}</p>
                  </div>
                  <FeaturedSwitch
                    active={featured}
                    disabled={busy}
                    onToggle={() => handleToggle(item.id, featured)}
                  />
                </li>
              );
            })}
          </ul>

          <div className="admin-feature-footer">
            <p className="admin-feature-range">
              Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{filteredSorted.length}</strong>
              {search.trim() ? ' matching' : ''}
            </p>
            <div className="admin-feature-pagination">
              <button
                type="button"
                className="admin-feature-page-btn"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="admin-feature-page-indicator">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                className="admin-feature-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

