import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import LazyWhenVisible from './LazyWhenVisible';
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

function LazySection({ title, to, variant = 'browse', compact = false, children }) {
  const fallback = (
    <HomeSectionCardSkeleton
      title={title}
      to={to}
      variant={variant}
      compact={compact}
    />
  );

  return (
    <LazyWhenVisible fallback={fallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </LazyWhenVisible>
  );
}

export default function ExploreSection() {
  const { t } = useTranslation();

  return (
    <>
      <FeaturedDomainsSection />
      <DomainsSection />

      <LazySection title={t('homeVentureRegister', { defaultValue: 'Ventures' })} to="/ventures">
        <VenturesSection />
      </LazySection>

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

      {PUBLIC_OPERATIONS_SECTIONS.map((section) => (
        <LazySection
          key={section.id}
          title={section.homeLabel || t(section.labelKey, { defaultValue: section.defaultLabel })}
          to={operationsPathForSection(section.id)}
          compact
        >
          <HomeOperationsCarouselSection sectionId={section.id} />
        </LazySection>
      ))}

      <LazySection
        title={t('homeRegistrationsTitle', { defaultValue: 'Delta Registrations' })}
        to="/registrations"
        compact
      >
        <HomeRegistrationsSection />
      </LazySection>

      <LazySection title="Deltapreneur" to="/community" compact>
        <CommunitySection />
      </LazySection>

      <LazyWhenVisible>
        <Suspense fallback={null}>
          <FeedbackSection />
        </Suspense>
      </LazyWhenVisible>
    </>
  );
}
