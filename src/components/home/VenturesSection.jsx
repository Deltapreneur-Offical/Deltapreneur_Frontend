import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ventureAPI } from '../../api/services';
import { fetchHomepageVenturePreview } from '../../utils/homepagePreview';
import { useHomepageCardReveal } from '../../utils/homepageCardReveal';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeCardsNavRow from './HomeCardsNavRow';
import { HomePreviewRowItem } from './HomePreviewRow';
import VentureListingCard from '../listings/VentureListingCard';
import '../../styles/domain-listing-cards.css';
/* After domain-listing-cards so homepage blue pill borders win over saffron defaults. */
import '../../styles/home-saffron.css';
/* Mobile home Ventures final lock — after shared price-cta rules. */
import '../../styles/home-ventures-mobile.css';

export default function VenturesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ventures, setVentures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVentures = async () => {
      try {
        setLoading(true);
        const rows = await fetchHomepageVenturePreview(
          (params) => ventureAPI.getAll(params),
          'VENTURE',
        );
        setVentures(rows);
      } catch {
        setVentures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVentures();
  }, []);

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', ventures);
  const { visible, hasMore, revealMore } = useHomepageCardReveal(ventures);

  const handleViewDetails = (ventureId) => {
    navigateToListingDetail(navigate, 'venture', ventureId);
  };

  const renderVentureCard = (venture) => (
    <HomePreviewCardShell accent="venture">
      <VentureListingCard
        venture={venture}
        browseMode
        compact
        homepageVentureContentOnly
        likeState={getLike(venture.id)}
        onLike={() => toggleLike(venture.id)}
        onView={() => handleViewDetails(venture.id)}
      />
    </HomePreviewCardShell>
  );

  if (loading) {
    return (
      <HomeSectionCardSkeleton
        title={t('homeVentureRegister', { defaultValue: 'Ventures' })}
        to="/ventures?mode=venture"
        accent="venture"
        compact
      />
    );
  }

  return (
    <section className="home-ventures-section bg-transparent md:bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={t('homeVentureRegister', { defaultValue: 'Ventures' })}
          to="/ventures?mode=venture"
          accent="venture"
          showViewAll={ventures.length > 0}
        />
        {ventures.length === 0 ? (
          <p className="home-section-empty text-center text-gray-500">{t('noVentures')}</p>
        ) : (
          <HomeCardsNavRow
            accent="venture"
            ariaLabel={t('homeVentureRegister', { defaultValue: 'Ventures' })}
            hasMore={hasMore}
            onRevealMore={revealMore}
          >
            {visible.map((venture) => (
              <HomePreviewRowItem key={venture.id}>
                {renderVentureCard(venture)}
              </HomePreviewRowItem>
            ))}
          </HomeCardsNavRow>
        )}
      </div>
    </section>
  );
}
