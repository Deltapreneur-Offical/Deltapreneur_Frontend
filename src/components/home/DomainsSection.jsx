import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domainAPI } from '../../api/services';
import { extractDomainList } from '../../utils/domainApiAdapter';
import { fetchListPage, HOME_FEATURED_LIST_PARAMS } from '../../utils/listPagination';
import { pickHomepagePreviewListings, HOMEPAGE_PREVIEW_LIMIT } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import DomainListingCard from '../listings/DomainListingCard';
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
        const { items } = await fetchListPage((params) => domainAPI.getAll(params), {
          ...HOME_FEATURED_LIST_PARAMS,
        });
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

  const previewDomains = useMemo(
    () => pickHomepagePreviewListings(domains, 'domain', HOMEPAGE_PREVIEW_LIMIT),
    [domains],
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
                <HomePreviewCardShell>
                  <DomainListingCard
                    domain={domain}
                    browseMode={true}
                    likeState={getLike(domain.id)}
                    onLike={() => toggleLike(domain.id)}
                    onView={() => handleViewDetails(domain.id)}
                  />
                </HomePreviewCardShell>
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
