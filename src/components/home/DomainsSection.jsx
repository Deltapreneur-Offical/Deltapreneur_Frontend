import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domainAPI } from '../../api/services';
import { extractDomainList } from '../../utils/domainApiAdapter';
import { pickHomepagePreviewListings } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import ListingCardShell from '../listings/ListingCardShell';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import HomeUnifiedListingCard from './HomeUnifiedListingCard';
import HomeSectionHeader from './HomeSectionHeader';
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

  return (
    <section className="bg-white pt-0 pb-3 md:pt-0 md:pb-4">
      <div className="w-full">
        <HomeSectionHeader title={t('domains')} to="/domains" />
        {loading ? (
          <p className="text-center text-gray-500 py-4">{t('loading')}</p>
        ) : previewDomains.length === 0 ? (
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
