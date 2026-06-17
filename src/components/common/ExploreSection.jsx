import { useTranslation } from 'react-i18next';
import LazyWhenVisible from './LazyWhenVisible';
import DomainsSection from '../home/DomainsSection';
import VenturesSection from '../home/VenturesSection';
import CoVenturesSection from '../home/CoVenturesSection';
import TechnologySection from '../home/TechnologySection';
import CommunitySection from '../home/CommunitySection';
import AuctionsSection from '../home/AuctionsSection';
import FeedbackSection from '../home/FeedbackSection';
import HomeSectionCardSkeleton from '../home/HomeSectionCardSkeleton';

function LazySection({ title, to, children }) {
  return (
    <LazyWhenVisible fallback={<HomeSectionCardSkeleton title={title} to={to} />}>
      {children}
    </LazyWhenVisible>
  );
}

export default function ExploreSection() {
  const { t } = useTranslation();

  return (
    <>
      <DomainsSection />
      <VenturesSection />

      <LazySection
        title={t('coVentureSectionTitle', { defaultValue: 'Co-Venture' })}
        to="/ventures?mode=co-venture"
      >
        <CoVenturesSection />
      </LazySection>

      <LazySection title={t('technologySoftware')} to="/technology">
        <TechnologySection />
      </LazySection>

      <LazySection title={t('disruptors')} to="/community">
        <CommunitySection />
      </LazySection>

      <LazySection title={t('auctions')} to="/auctions">
        <AuctionsSection />
      </LazySection>

      <LazyWhenVisible>
        <FeedbackSection />
      </LazyWhenVisible>
    </>
  );
}
