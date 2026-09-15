import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { domainAPI } from '../../api/services';
import { asArray } from '../../utils/asArray';
import { normalizeDomainRecord } from '../../utils/domainApiAdapter';
import { isOpenProviderShowcaseRow } from '../../utils/homepageListings';
import HomeCardsNavRow from './HomeCardsNavRow';
import { HomePreviewRowItem } from './HomePreviewRow';
import ShowcaseDomainCard from '../listings/ShowcaseDomainCard';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import '../../styles/domain-listing-cards.css';

/**
 * Homepage "Delta Domains" — OpenProvider Showcase premium cards only.
 * Marketplace listings sit in FeaturedDomainsSection above this row.
 */
export default function DomainsSection() {
  const { t } = useTranslation();
  const [previewDomains, setPreviewDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasFetchedDomains, setHasFetchedDomains] = useState(false);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const { data } = await domainAPI.getShowcaseDomains();
        if (!data?.enabled) {
          setPreviewDomains([]);
          return;
        }
        const rows = asArray(data)
          .map(normalizeDomainRecord)
          .filter(isOpenProviderShowcaseRow);
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

  if (loading || !hasFetchedDomains) {
    return (
      <HomeSectionCardSkeleton
        title={t('homeDomainRegister', { defaultValue: 'Delta Domains' })}
        to="/domains"
        accent="domain"
      />
    );
  }

  return (
    <section className="home-domains-section bg-white pt-3 pb-4 md:pt-4 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={t('homeDomainRegister', { defaultValue: 'Delta Domains' })}
          to="/domains"
          accent="domain"
          showViewAll={previewDomains.length > 0}
        />
        {previewDomains.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{t('noDomains')}</p>
        ) : (
          <HomeCardsNavRow
            accent="domain"
            ariaLabel={t('homeDomainRegister', { defaultValue: 'Delta Domains' })}
          >
            {previewDomains.map((domain) => (
              <HomePreviewRowItem key={domain.id || domain.domainName}>
                <ShowcaseDomainCard
                  item={domain}
                  shareContext={{
                    shareType: 'DOMAIN_LISTING',
                    originalQuery: domain.domainName || domain.name,
                  }}
                />
              </HomePreviewRowItem>
            ))}
          </HomeCardsNavRow>
        )}
      </div>
    </section>
  );
}
