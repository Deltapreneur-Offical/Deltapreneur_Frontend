import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import FeaturedDomainsSection from '../home/FeaturedDomainsSection';
import { HOMEPAGE_OPERATIONS_SECTIONS, operationsPathForSection } from '../../utils/operationsSections';
import HomeSectionCardSkeleton from '../home/HomeSectionCardSkeleton';
import NearViewport from '../home/NearViewport';

const DomainsSection = lazy(() => import('../home/DomainsSection'));
const VenturesSection = lazy(() => import('../home/VenturesSection'));
const CoVenturesSection = lazy(() => import('../home/CoVenturesSection'));
const AuctionsSection = lazy(() => import('../home/AuctionsSection'));
const TechnologySection = lazy(() => import('../home/TechnologySection'));
const HomeOperationsCarouselSection = lazy(() => import('../home/HomeOperationsCarouselSection'));
const HomeRegistrationsSection = lazy(() => import('../home/HomeRegistrationsSection'));
const CommunitySection = lazy(() => import('../home/CommunitySection'));
const FeedbackSection = lazy(() => import('../home/FeedbackSection'));

function IndependentSection({ title, to, variant = 'browse', compact = false, accent, children }) {
  const sectionAccent = accent || (variant === 'auction' ? 'auction' : undefined);
  const reserved = (
    <HomeSectionCardSkeleton
      title={title}
      to={to}
      accent={sectionAccent}
      variant={variant}
      compact={compact}
      reserveOnly
    />
  );
  const loading = (
    <HomeSectionCardSkeleton
      title={title}
      to={to}
      accent={sectionAccent}
      variant={variant}
      compact={compact}
    />
  );

  return (
    <NearViewport fallback={reserved}>
      <Suspense fallback={loading}>
        {children}
      </Suspense>
    </NearViewport>
  );
}

export default function ExploreSection() {
  const { t } = useTranslation();

  return (
    <>
      <FeaturedDomainsSection />
      <IndependentSection
        title={t('homeDomainRegister', { defaultValue: 'Delta Domains' })}
        to="/domains"
      >
        <DomainsSection />
      </IndependentSection>

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

      {HOMEPAGE_OPERATIONS_SECTIONS.map((section) => (
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

      <NearViewport fallback={<div className="min-h-[18rem]" aria-hidden="true" />}>
        <Suspense fallback={<div className="min-h-[18rem]" aria-hidden="true" />}>
          <FeedbackSection />
        </Suspense>
      </NearViewport>
    </>
  );
}
