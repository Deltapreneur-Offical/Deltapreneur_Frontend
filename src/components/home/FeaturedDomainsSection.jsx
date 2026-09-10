import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domainAPI } from '../../api/services';
import { fetchHomepageSectionPreview } from '../../utils/homepagePreview';
import { isOpenProviderShowcaseRow } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { isListingOwner } from '../../utils/listingVisibility';
import { useAuth } from '../../context/AuthContext';
import { useLikes } from '../../hooks/useLikes';
import HomeCardsNavRow from './HomeCardsNavRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import HomePreviewCardSkeleton from './HomePreviewCardSkeleton';
import DomainListingCard from '../listings/DomainListingCard';
import HomeSectionHeader from './HomeSectionHeader';
import '../../styles/domain-listing-cards.css';

function isMarketplaceFeaturedRow(item) {
  return Boolean(item?.featured) && !isOpenProviderShowcaseRow(item);
}

/**
 * Homepage "Domains" — marketplace listings the admin toggled on in
 * Homepage Features. Showcase premiums stay in Delta Domains above.
 */
export default function FeaturedDomainsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [previewDomains, setPreviewDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const title = t('homeMarketplaceDomains', { defaultValue: 'Domains' });

  useEffect(() => {
    let cancelled = false;
    const fetchDomains = async () => {
      try {
        setLoading(true);
        let rows = await fetchHomepageSectionPreview(
          (params) => domainAPI.getAll(params),
          'domain',
          undefined,
          {
            featuredQuery: {},
            fillCatalog: false,
            filterFn: (item) => !isOpenProviderShowcaseRow(item),
          },
        );
        if (!rows.length) {
          rows = await fetchHomepageSectionPreview(
            (params) => domainAPI.getAll(params),
            'domain',
            undefined,
            { filterFn: isMarketplaceFeaturedRow },
          );
        }
        if (!cancelled) setPreviewDomains(rows);
      } catch {
        if (!cancelled) setPreviewDomains([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDomains();
    return () => {
      cancelled = true;
    };
  }, []);

  const { toggle: toggleLike, get: getLike } = useLikes('DOMAIN', previewDomains);

  const handleViewDetails = (domainId) => {
    navigateToListingDetail(navigate, 'domain', domainId);
  };

  return (
    <section className="home-domains-section home-marketplace-domains-section bg-white pt-3 pb-4 md:pt-4 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={title}
          to="/domains"
          accent="domain"
          showViewAll={!loading && previewDomains.length > 0}
        />
        {loading ? (
          <HomePreviewRow animate={false}>
            {Array.from({ length: 5 }).map((_, i) => (
              <HomePreviewRowItem key={i}>
                <HomePreviewCardSkeleton variant="browse" />
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        ) : previewDomains.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{t('noDomains')}</p>
        ) : (
          <HomeCardsNavRow accent="domain" ariaLabel={title}>
            {previewDomains.map((domain) => (
              <HomePreviewRowItem key={domain.id}>
                <DomainListingCard
                  domain={domain}
                  browseMode={true}
                  marketplace
                  isOwner={isListingOwner(domain, user, 'domain')}
                  likeState={getLike(domain.id)}
                  onLike={() => toggleLike(domain.id)}
                  onView={() => handleViewDetails(domain.id)}
                />
              </HomePreviewRowItem>
            ))}
          </HomeCardsNavRow>
        )}
      </div>
    </section>
  );
}
