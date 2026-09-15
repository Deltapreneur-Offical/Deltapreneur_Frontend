import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DomainsSection from '../home/DomainsSection';
import FeaturedDomainsSection from '../home/FeaturedDomainsSection';
import { PUBLIC_OPERATIONS_SECTIONS, operationsPathForSection } from '../../utils/operationsSections';
import HomeSectionCardSkeleton from '../home/HomeSectionCardSkeleton';

const VenturesSection = lazy(() => import('../home/VenturesSection'));
const CoVenturesSection = lazy(() => import('../home/CoVenturesSection'));
const AuctionsSection = lazy(() => import('../home/AuctionsSection'));
const TechnologySection = lazy(() => import('../home/TechnologySection'));
const HomeOperationsCarouselSection = lazy(() => import('../home/HomeOperationsCarouselSection'));
const HomeRegistrationsSection = lazy(() => import('../home/HomeRegistrationsSection'));
const CommunitySection = lazy(() => import('../home/CommunitySection'));
const FeedbackSection = lazy(() => import('../home/FeedbackSection'));

const PREFETCH_SECTIONS = [
  () => import('../home/VenturesSection'),
  () => import('../home/CoVenturesSection'),
  () => import('../home/AuctionsSection'),
  () => import('../home/TechnologySection'),
  () => import('../home/HomeOperationsCarouselSection'),
  () => import('../home/HomeRegistrationsSection'),
  () => import('../home/CommunitySection'),
  () => import('../home/FeedbackSection'),
];

function IndependentSection({ title, to, variant = 'browse', compact = false, children }) {
  const fallback = (
    <HomeSectionCardSkeleton
      title={title}
      to={to}
      variant={variant}
      compact={compact}
    />
  );

  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

export default function ExploreSection() {
  const { t } = useTranslation();

  useEffect(() => {
    PREFETCH_SECTIONS.forEach((load) => {
      void load();
    });
  }, []);

  return (
    <>
      <FeaturedDomainsSection />
      <DomainsSection />

      <IndependentSection title={t('homeVentureRegister', { defaultValue: 'Ventures' })} to="/ventures">
        <VenturesSection />
      </IndependentSection>

      <IndependentSection
        title={t('homeCoVenturesRegister', { defaultValue: 'Delta Ventures' })}
        to="/ventures?mode=co-venture"
        compact
      >
        <CoVenturesSection />
      </IndependentSection>

      <IndependentSection title={t('homeRegistryAuctions', { defaultValue: 'Auctions' })} to="/auctions" variant="auction">
        <AuctionsSection />
      </IndependentSection>

      <IndependentSection title={t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })} to="/technology">
        <TechnologySection />
      </IndependentSection>

      {PUBLIC_OPERATIONS_SECTIONS.map((section) => (
        <IndependentSection
          key={section.id}
          title={section.homeLabel || t(section.labelKey, { defaultValue: section.defaultLabel })}
          to={operationsPathForSection(section.id)}
          compact
        >
          <HomeOperationsCarouselSection sectionId={section.id} />
        </IndependentSection>
      ))}

      <IndependentSection
        title={t('homeRegistrationsTitle', { defaultValue: 'Delta Registrations' })}
        to="/registrations"
        compact
      >
        <HomeRegistrationsSection />
      </IndependentSection>

      <IndependentSection title="Deltapreneur" to="/community" compact>
        <CommunitySection />
      </IndependentSection>

      <Suspense fallback={null}>
        <FeedbackSection />
      </Suspense>
    </>
  );
}
