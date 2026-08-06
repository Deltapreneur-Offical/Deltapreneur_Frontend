import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cocreationAPI } from '../../api/services';
import { technologyServicesAPI } from '../../api/technologyServicesApi';
import { fetchHomepageSectionPreview } from '../../utils/homepagePreview';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import TechnologyListingCard from '../listings/TechnologyListingCard';
import TechnologyServiceCard from '../technology/TechnologyServiceCard';
import { ArrowRight, Sparkles } from 'lucide-react';
import '../../styles/domain-listing-cards.css';

export default function TechnologySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [previewSoftwares, setPreviewSoftwares] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [rows, servRes] = await Promise.allSettled([
          fetchHomepageSectionPreview(
            (params) => cocreationAPI.getAll(params),
            'software',
            undefined,
            { featuredQuery: {} },
          ),
          technologyServicesAPI.getServices({ featured_only: true }),
        ]);

        if (rows.status === 'fulfilled') {
          setPreviewSoftwares(rows.value || []);
        }
        if (servRes.status === 'fulfilled') {
          setFeaturedServices((servRes.value?.data || servRes.value || []).slice(0, 8));
        }
      } catch {
        setPreviewSoftwares([]);
        setFeaturedServices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const { toggle: toggleLike, get: getLike } = useLikes('SOFTWARE', previewSoftwares);

  const handleViewDetails = (softwareId) => {
    navigateToListingDetail(navigate, 'software', softwareId);
  };

  const shouldAutoScroll = useShouldAutoScroll(previewSoftwares.length);

  const renderTechnologyCard = (item) => (
    <HomePreviewCardShell accent="technology">
      <TechnologyListingCard
        item={item}
        browseMode
        likeState={getLike(item.id)}
        onLike={() => toggleLike(item.id)}
        onView={() => handleViewDetails(item.id)}
      />
    </HomePreviewCardShell>
  );

  if (loading) {
<<<<<<< HEAD
    return <HomeSectionCardSkeleton title={t('technologySoftware')} to="/technology" accent="technology" />;
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={t('technologySoftware')}
          to="/technology"
          accent="technology"
          showViewAll={previewSoftwares.length > 0}
        />
        {previewSoftwares.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noSoftware')}</p>
        ) : shouldAutoScroll ? (
          <HomeAutoScrollRow durationSec={50} ariaLabel={t('technologySoftware')}>
            {previewSoftwares.map((item) => (
              <HomeAutoScrollRowItem key={item.id}>
                {renderTechnologyCard(item)}
              </HomeAutoScrollRowItem>
            ))}
          </HomeAutoScrollRow>
        ) : (
          <HomePreviewRow>
            {previewSoftwares.map((item) => (
              <HomePreviewRowItem key={item.id}>
                {renderTechnologyCard(item)}
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
=======
    return <HomeSectionCardSkeleton title={t('technologySoftware', { defaultValue: 'Technologies' })} to="/technology" />;
  }

  return (
    <section className="bg-white pt-2 pb-6 md:pt-4 md:pb-10 min-w-0 overflow-visible">
      <div className="w-full min-w-0 space-y-8">

        {/* 1. Marketplace Technology Listings */}
        {previewSoftwares.length > 0 && (
          <div>
            <HomeSectionHeader title={t('technologySoftware', { defaultValue: 'Marketplace Listings' })} to="/technology" />
            {shouldAutoScroll ? (
              <HomeAutoScrollRow durationSec={50} ariaLabel={t('technologySoftware')}>
                {previewSoftwares.map((item) => (
                  <HomeAutoScrollRowItem key={item.id}>
                    {renderTechnologyCard(item)}
                  </HomeAutoScrollRowItem>
                ))}
              </HomeAutoScrollRow>
            ) : (
              <HomePreviewRow>
                {previewSoftwares.map((item) => (
                  <HomePreviewRowItem key={item.id}>
                    {renderTechnologyCard(item)}
                  </HomePreviewRowItem>
                ))}
              </HomePreviewRow>
            )}
          </div>
>>>>>>> c1f7ddb (Update domain search and technology services)
        )}

        {/* 2. Featured Technology Services Catalogue */}
        <div>
          <div className="flex items-center justify-between mb-6 px-4 sm:px-6 lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 mb-1 border border-indigo-100">
                <Sparkles className="h-3.5 w-3.5" />
                Featured CoBrother Services
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Technology Services Catalogue
              </h2>
            </div>
            <button
              onClick={() => navigate('/technology')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View All Services
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredServices.map((service) => (
                <TechnologyServiceCard key={service.id || service.slug} service={service} compact />
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
