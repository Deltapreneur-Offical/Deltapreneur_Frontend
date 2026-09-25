import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cocreationAPI } from '../../api/services';
import { technologyServicesAPI } from '../../api/technologyServicesApi';
import { fetchHomepageSectionPreview } from '../../utils/homepagePreview';
import { asArray } from '../../utils/asArray';
import { HOMEPAGE_PREVIEW_LIMIT } from '../../utils/homepageListings';
import { useHomepageCardReveal } from '../../utils/homepageCardReveal';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomePreviewCardSkeleton from './HomePreviewCardSkeleton';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeCardsNavRow from './HomeCardsNavRow';
import { HomePreviewRowItem } from './HomePreviewRow';
import TechnologyListingCard from '../listings/TechnologyListingCard';
import TechnologyServiceCard from '../technology/TechnologyServiceCard';
import { ArrowRight, Sparkles } from 'lucide-react';
import '../../styles/domain-listing-cards.css';

export default function TechnologySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [previewSoftwares, setPreviewSoftwares] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [softwareLoading, setSoftwareLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchHomepageSectionPreview(
      (params) => cocreationAPI.getAll(params),
      'software',
      undefined,
      { featuredQuery: {}, fillCatalog: false, maxPages: 2 },
    )
      .then((rows) => {
        if (!cancelled) setPreviewSoftwares(rows || []);
      })
      .catch(() => {
        if (!cancelled) setPreviewSoftwares([]);
      })
      .finally(() => {
        if (!cancelled) setSoftwareLoading(false);
      });

    technologyServicesAPI.getServices({ page_size: HOMEPAGE_PREVIEW_LIMIT })
      .then((servRes) => {
        if (cancelled) return;
        const services = servRes?.data?.data || servRes?.data || [];
        setFeaturedServices(
          asArray(services)
            .slice()
            .sort((a, b) => Number(Boolean(b.featured ?? b.is_featured)) - Number(Boolean(a.featured ?? a.is_featured)))
            .slice(0, HOMEPAGE_PREVIEW_LIMIT),
        );
      })
      .catch(() => {
        if (!cancelled) setFeaturedServices([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { toggle: toggleLike, get: getLike } = useLikes('SOFTWARE', previewSoftwares);
  const softwareReveal = useHomepageCardReveal(previewSoftwares);
  const serviceReveal = useHomepageCardReveal(featuredServices);
  const servicesHaveMore = serviceReveal.hasMore;
  const revealServices = serviceReveal.revealMore;

  const handleViewDetails = useCallback((softwareId) => {
    navigateToListingDetail(navigate, 'software', softwareId);
  }, [navigate]);

  const renderTechnologyCard = useCallback((item) => (
    <HomePreviewCardShell accent="technology">
      <TechnologyListingCard
        item={item}
        browseMode
        likeState={getLike(item.id)}
        onLike={() => toggleLike(item.id)}
        onView={() => handleViewDetails(item.id)}
      />
    </HomePreviewCardShell>
  ), [getLike, toggleLike, handleViewDetails]);

  if (softwareLoading && servicesLoading) {
    return <HomeSectionCardSkeleton title={t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })} to="/technology" />;
  }

  return (
    <section className="bg-white pt-2 pb-6 md:pt-4 md:pb-10 min-w-0 overflow-visible">
      <div className="w-full min-w-0 space-y-8">

        {/* 1. Marketplace Technology Listings */}
        {softwareLoading ? (
          <div>
            <HomeSectionHeader title={t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })} to="/technology" accent="technology" />
            <HomeCardsNavRow
              accent="technology"
              ariaLabel={t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })}
              hasMore={softwareReveal.hasMore}
              onRevealMore={softwareReveal.revealMore}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <HomePreviewRowItem key={`software-skel-${i}`}>
                  <HomePreviewCardSkeleton variant="browse" />
                </HomePreviewRowItem>
              ))}
            </HomeCardsNavRow>
          </div>
        ) : previewSoftwares.length > 0 ? (
          <div>
            <HomeSectionHeader title={t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })} to="/technology" accent="technology" />
            <HomeCardsNavRow
              accent="technology"
              ariaLabel={t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })}
              hasMore={softwareReveal.hasMore}
              onRevealMore={softwareReveal.revealMore}
            >
              {softwareReveal.visible.map((item) => (
                <HomePreviewRowItem key={item.id}>
                  {renderTechnologyCard(item)}
                </HomePreviewRowItem>
              ))}
            </HomeCardsNavRow>
          </div>
        ) : null}

        {/* 2. Featured Technology Services Catalogue */}
        <div className="home-deltaos-services home-deltaos-services--ref px-4 sm:px-6 lg:px-8">
          <div className="home-deltaos-services__header">
            <div className="home-deltaos-services__header-left">
              <div className="home-deltaos-services__eyebrow">
                <Sparkles className="h-3 w-3" />
                {t('homeFeaturedServices', { defaultValue: 'Featured Deltapreneur Services' })}
              </div>
              <h2 className="home-deltaos-services__title">
                {t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })}
              </h2>
            </div>
            <div className="home-deltaos-services__header-right">
              <button
                onClick={() => navigate('/technology')}
                className="home-deltaos-services__view-all"
              >
                {t('viewAll', { defaultValue: 'View All' })}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <HomeCardsNavRow
            className="home-deltaos-services-nav"
            accent="technology"
            ariaLabel="Technology Register"
            hasMore={servicesHaveMore}
            onRevealMore={revealServices}
          >
            {servicesLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <HomePreviewRowItem key={`service-skel-${i}`}>
                  <HomePreviewCardSkeleton variant="browse" />
                </HomePreviewRowItem>
              ))
              : serviceReveal.visible.map((service) => (
                <HomePreviewRowItem key={service.id || service.slug}>
                  <TechnologyServiceCard service={service} compact homeLayout />
                </HomePreviewRowItem>
              ))}
          </HomeCardsNavRow>
        </div>

      </div>
    </section>
  );
}
