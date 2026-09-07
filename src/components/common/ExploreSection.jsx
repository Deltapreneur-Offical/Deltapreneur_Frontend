import { useTranslation } from 'react-i18next';
import LazyWhenVisible from './LazyWhenVisible';
import DomainsSection from '../home/DomainsSection';
import HomeRegistrationsSection from '../home/HomeRegistrationsSection';
import VenturesSection from '../home/VenturesSection';
import CoVenturesSection from '../home/CoVenturesSection';
import TechnologySection from '../home/TechnologySection';
import CommunitySection from '../home/CommunitySection';
import AuctionsSection from '../home/AuctionsSection';
import FeedbackSection from '../home/FeedbackSection';
import HomeOperationsCarouselSection from '../home/HomeOperationsCarouselSection';
import { OPERATIONS_SECTIONS, operationsPathForSection } from '../../utils/operationsSections';
import HomeSectionCardSkeleton from '../home/HomeSectionCardSkeleton';

function LazySection({ title, to, variant = 'browse', compact = false, children }) {
  return (
    <LazyWhenVisible
      fallback={(
        <HomeSectionCardSkeleton
          title={title}
          to={to}
          variant={variant}
          compact={compact}
        />
      )}
    >
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
        title={t('homeCoVenturesRegister', { defaultValue: 'Delta Ventures' })}
        to="/ventures?mode=co-venture"
        compact
      >
        <CoVenturesSection />
      </LazySection>

      <LazySection title={t('homeRegistryAuctions', { defaultValue: 'Auctions' })} to="/auctions" variant="auction">
        <AuctionsSection />
      </LazySection>

      <LazySection title={t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })} to="/technology">
        <TechnologySection />
      </LazySection>

      {OPERATIONS_SECTIONS.map((section) => (
        <LazySection
          key={section.id}
          title={section.homeLabel || t(section.labelKey, { defaultValue: section.defaultLabel })}
          to={operationsPathForSection(section.id)}
          compact
        >
          <HomeOperationsCarouselSection sectionId={section.id} />
        </LazySection>
      ))}

      <HomeRegistrationsSection />

      <LazySection title={t('disruptors')} to="/community" compact>
        <CommunitySection />
      </LazySection>

      <LazyWhenVisible>
        <FeedbackSection />
      </LazyWhenVisible>
    </>
  );
}
