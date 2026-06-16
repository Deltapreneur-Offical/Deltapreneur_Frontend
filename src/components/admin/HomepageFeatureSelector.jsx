import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { adminAPI } from '../../api/services';
import { isActiveListing, isHomepageFeaturedListing } from '../../utils/homepageListings';
import { asArray } from '../../utils/asArray';

const SECTION_KEYS = {
  domain: 'homepageFeatureDomains',
  venture: 'homepageFeatureVentures',
  software: 'homepageFeatureSoftware',
  community: 'homepageFeatureCreators',
};

const TYPE_KEYS = {
  domain: 'homepageFeatureTypeDomains',
  venture: 'homepageFeatureTypeVentures',
  software: 'homepageFeatureTypeSoftware',
  community: 'homepageFeatureTypeCommunities',
};

const PAGE_SIZES = [25, 50, 100];

function getTitle(item, type) {
  if (type === 'domain') return `${item.domainName || ''}${item.domainExtension || ''}`;
  if (type === 'venture') return item.brandDetails?.brandName || `Venture #${item.id}`;
  if (type === 'software') return item.name || `Software #${item.id}`;
  if (type === 'community') return item.name || `Creator #${item.id}`;
  return '';
}

function sameItemId(a, b) {
  return String(a ?? '') === String(b ?? '');
}

function FeaturedSwitch({ active, pending, onToggle, t }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-busy={pending}
      aria-label={active ? t('homepageFeatureSwitchRemove') : t('homepageFeatureSwitchAdd')}
      onClick={onToggle}
      className={`admin-feature-switch ${active ? 'is-on' : ''} ${pending ? 'is-busy' : ''}`}
    >
      <span className="admin-feature-switch-track">
        <span className="admin-feature-switch-thumb" />
      </span>
      <span className="admin-feature-switch-text">{active ? t('homepageFeatureSwitchFeatured') : t('homepageFeatureSwitchFeature')}</span>
    </button>
  );
}

export default function HomepageFeatureSelector({ type }) {
  const { t } = useTranslation();
  const typeLabel = t(TYPE_KEYS[type]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pendingIds, setPendingIds] = useState(() => new Set());

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
    if (pendingIds.has(String(id))) return;

    const nextFeatured = !currentFeatured;
    const typeMap = {
      domain: 'DOMAIN',
      venture: 'VENTURE',
      software: 'SOFTWARE',
      community: 'COMMUNITY',
    };

    setPendingIds((prev) => new Set(prev).add(String(id)));
    setItems((prev) =>
      prev.map((item) => (sameItemId(item.id, id) ? { ...item, featured: nextFeatured } : item)),
    );

    try {
      const response = await adminAPI.toggleFeatured(typeMap[type], id, nextFeatured);
      const confirmedFeatured = response?.data?.featured;
      if (typeof confirmedFeatured === 'boolean') {
        setItems((prev) =>
          prev.map((item) =>
            sameItemId(item.id, id) ? { ...item, featured: confirmedFeatured } : item,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to toggle homepage feature:', error);
      setItems((prev) =>
        prev.map((item) => (sameItemId(item.id, id) ? { ...item, featured: currentFeatured } : item)),
      );
      alert(t('homepageFeatureToggleFailed'));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(String(id));
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="admin-feature-card admin-feature-card--loading">
        <div className="admin-feature-spinner" />
        <p className="admin-feature-loading-text">{t('homepageFeatureLoading', { type: typeLabel })}</p>
      </div>
    );
  }

  return (
    <div className="admin-feature-card">
      <div className="admin-feature-card-head">
        <div className="admin-feature-card-head-main">
          <h3 className="admin-feature-card-title">{t(SECTION_KEYS[type])}</h3>
          <p className="admin-feature-card-subtitle">
            {t('homepageFeatureSubtitle')}
          </p>
        </div>
        <div className="admin-feature-stats">
          <span className="admin-feature-stat">
            <Star size={14} className="admin-feature-stat-icon" aria-hidden />
            {t('homepageFeatureCount', { count: featuredCount })}
          </span>
          <span className="admin-feature-stat admin-feature-stat--muted">
            {t('homepageFeatureTotal', { count: featureableItems.length })}
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
            placeholder={t('homepageFeatureSearchPlaceholder', { type: typeLabel })}
            className="admin-feature-search"
            aria-label={t('homepageFeatureSearchPlaceholder', { type: typeLabel })}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-feature-select"
          aria-label="Filter by featured status"
        >
          <option value="all">{t('homepageFeatureFilterAll')}</option>
          <option value="featured">{t('homepageFeatureFilterFeatured')}</option>
          <option value="unfeatured">{t('homepageFeatureFilterUnfeatured')}</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="admin-feature-select"
          aria-label="Sort list"
        >
          <option value="name-asc">{t('homepageFeatureSortNameAsc')}</option>
          <option value="name-desc">{t('homepageFeatureSortNameDesc')}</option>
          <option value="id-asc">{t('homepageFeatureSortIdAsc')}</option>
          <option value="id-desc">{t('homepageFeatureSortIdDesc')}</option>
          <option value="featured-first">{t('homepageFeatureSortFeaturedFirst')}</option>
        </select>

        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="admin-feature-select admin-feature-select--compact"
          aria-label="Items per page"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{t('homepageFeaturePerPage', { count: n })}</option>
          ))}
        </select>
      </div>

      {featureableItems.length === 0 ? (
        <p className="admin-feature-empty">{t('homepageFeatureEmptyActive', { type: typeLabel })}</p>
      ) : filteredSorted.length === 0 ? (
        <p className="admin-feature-empty">{t('homepageFeatureEmptyMatches')}</p>
      ) : (
        <>
          <ul className="admin-feature-list" aria-live="polite">
            {paginated.map((item) => {
              const featured = Boolean(item.featured);
              const pending = pendingIds.has(String(item.id));
              return (
                <li
                  key={item.id}
                  className={`admin-feature-row ${featured ? 'is-featured' : ''} ${pending ? 'is-busy' : ''}`}
                >
                  <div className="admin-feature-row-body">
                    <p className="admin-feature-item-title">{getTitle(item, type)}</p>
                    <p className="admin-feature-item-meta">{t('homepageFeatureId', { id: item.id })}</p>
                  </div>
                  <FeaturedSwitch
                    active={featured}
                    pending={pending}
                    onToggle={() => handleToggle(item.id, featured)}
                    t={t}
                  />
                </li>
              );
            })}
          </ul>

          <div className="admin-feature-footer">
            <p className="admin-feature-range">
              <Trans
                i18nKey="homepageFeatureRange"
                values={{ from: rangeStart, to: rangeEnd, total: filteredSorted.length }}
                components={{ strong: <strong /> }}
              />
              {search.trim() ? t('homepageFeatureRangeMatching') : ''}
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
                {t('homepageFeaturePage', { current: safePage, total: totalPages })}
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

