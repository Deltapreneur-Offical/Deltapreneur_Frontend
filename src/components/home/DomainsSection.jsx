import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domainAPI } from '../../api/services';
import { extractDomainList } from '../../utils/domainApiAdapter';
import { fetchAllListPages } from '../../utils/listPagination';
import { pickHomepagePreviewListings, HOMEPAGE_PREVIEW_LIMIT } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import { useHomepageMobile } from '../../hooks/useHomepageMobile';
import ListingCardShell from '../listings/ListingCardShell';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import HomeUnifiedListingCard from './HomeUnifiedListingCard';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import '../../styles/domain-listing-cards.css';

export default function DomainsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasFetchedDomains, setHasFetchedDomains] = useState(false);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const items = await fetchAllListPages((params) => domainAPI.getAll(params));
        setDomains(extractDomainList({ items, data: items }));
      } catch {
        setDomains([]);
      } finally {
        setLoading(false);
        setHasFetchedDomains(true);
      }
    };
    fetchDomains();
  }, []);

  const isMobile = useHomepageMobile();

  const previewDomains = useMemo(
    () => pickHomepagePreviewListings(
      domains,
      'domain',
      isMobile ? 1 : HOMEPAGE_PREVIEW_LIMIT,
    ),
    [domains, isMobile],
  );

  const { toggle: toggleLike, get: getLike } = useLikes('DOMAIN', previewDomains);

  const handleViewDetails = (domainId) => {
    navigateToListingDetail(navigate, 'domain', domainId);
  };

  if (loading || !hasFetchedDomains) {
    return <HomeSectionCardSkeleton title={t('domains')} to="/domains" />;
  }

  return (
    <section className="bg-white pt-0 pb-4 md:pt-0 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('domains')} to="/domains" />
        {previewDomains.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{t('noDomains')}</p>
        ) : (
          <HomePreviewRow>
            {previewDomains.map((domain) => (
              <HomePreviewRowItem key={domain.id}>
                <ListingCardShell>
                  <HomeUnifiedListingCard
                    type="domain"
                    listing={domain}
                    likeState={getLike(domain.id)}
                    onLike={() => toggleLike(domain.id)}
                    onView={() => handleViewDetails(domain.id)}
                  />
                </ListingCardShell>
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
