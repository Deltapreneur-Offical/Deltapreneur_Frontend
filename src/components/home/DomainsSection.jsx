import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domainAPI } from '../../api/services';
import { extractDomainList } from '../../utils/domainApiAdapter';
import { pickHomepagePreviewListings } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import DomainListingCard from '../listings/DomainListingCard';
import ListingCardShell from '../listings/ListingCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import '../../styles/domain-listing-cards.css';

export default function DomainsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const response = await domainAPI.getAll();
        setDomains(extractDomainList(response.data));
      } catch {
        setDomains([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDomains();
  }, []);

  const previewDomains = useMemo(
    () => pickHomepagePreviewListings(domains, 'domain'),
    [domains],
  );

  const { toggle: toggleLike, get: getLike } = useLikes('DOMAIN', previewDomains);

  const handleViewDetails = (domainId) => {
    navigateToListingDetail(navigate, 'domain', domainId);
  };

  if (loading) {
    return <HomeSectionCardSkeleton title={t('premiumDomains')} to="/domains" />;
  }

  return (
    <section className="bg-white py-4 md:py-6">
      <div className="w-full">
        <HomeSectionHeader title={t('premiumDomains')} to="/domains" />
        {previewDomains.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noDomains')}</p>
        ) : (
          <HomePreviewRow>
            {previewDomains.map((domain) => (
              <HomePreviewRowItem key={domain.id}>
                <ListingCardShell>
                  <DomainListingCard
                    browseMode
                    domain={domain}
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
