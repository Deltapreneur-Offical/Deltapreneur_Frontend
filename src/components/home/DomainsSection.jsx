import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domainAPI } from '../../api/services';
import { fetchHomepageSectionPreview } from '../../utils/homepagePreview';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import DomainListingCard from '../listings/DomainListingCard';
import ShowcaseDomainCard from '../listings/ShowcaseDomainCard';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import '../../styles/domain-listing-cards.css';

// rebuild marker - force frontend redeploy

export default function DomainsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [previewDomains, setPreviewDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasFetchedDomains, setHasFetchedDomains] = useState(false);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const rows = await fetchHomepageSectionPreview(
          (params) => domainAPI.getAll(params),
          'domain',
          undefined,
          { featuredQuery: {} },
        );
        setPreviewDomains(rows);
      } catch {
        setPreviewDomains([]);
      } finally {
        setLoading(false);
        setHasFetchedDomains(true);
      }
    };
    fetchDomains();
  }, []);

  const { toggle: toggleLike, get: getLike } = useLikes('DOMAIN', previewDomains);

  const handleViewDetails = (domainId) => {
    navigateToListingDetail(navigate, 'domain', domainId);
  };

  const shouldAutoScroll = useShouldAutoScroll(previewDomains.length);

  const isShowcaseRow = (domain) =>
    domain?.source === 'openprovider_showcase' || Boolean(domain?.showcaseId);

  const renderDomainCard = (domain) => {
    // OP Showcase rows render the PREMIUM Domain card (same component as the
    // Domains dashboard Premium cards) — never the marketplace card. The card
    // has its own amber border/glow + hover lift, so it renders bare in the
    // marquee (no outer shell) to match the premium card exactly.
    if (isShowcaseRow(domain)) {
      return <ShowcaseDomainCard item={domain} />;
    }
    return (
      <HomePreviewCardShell accent="domain">
        <DomainListingCard
          domain={domain}
          browseMode={true}
          likeState={getLike(domain.id)}
          onLike={() => toggleLike(domain.id)}
          onView={() => handleViewDetails(domain.id)}
        />
      </HomePreviewCardShell>
    );
  };

  if (loading || !hasFetchedDomains) {
    return <HomeSectionCardSkeleton title={t('domains')} to="/domains" accent="domain" />;
  }

  return (
    <section className="bg-white pt-3 pb-4 md:pt-4 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={t('domains')}
          to="/domains"
          accent="domain"
          showViewAll={previewDomains.length > 0}
        />
        {previewDomains.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{t('noDomains')}</p>
        ) : shouldAutoScroll ? (
          <HomeAutoScrollRow durationSec={40} ariaLabel={t('domains')}>
            {previewDomains.map((domain) => (
              <HomeAutoScrollRowItem key={domain.id}>
                {renderDomainCard(domain)}
              </HomeAutoScrollRowItem>
            ))}
          </HomeAutoScrollRow>
        ) : (
          <HomePreviewRow>
            {previewDomains.map((domain) => (
              <HomePreviewRowItem key={domain.id}>
                {renderDomainCard(domain)}
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
