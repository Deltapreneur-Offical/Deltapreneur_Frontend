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

function exploreLeadRowOrder(searchMode) {
  if (searchMode === 'auction') {
    return {
      domains: 'order-2',
      deltaDomains: 'order-3',
      ventures: 'order-4',
      coVentures: 'order-5',
      auctions: 'order-1',
    };
  }

  if (searchMode === 'premium') {
    return {
      domains: 'order-2',
      deltaDomains: 'order-1',
      ventures: 'order-3',
      coVentures: 'order-4',
      auctions: 'order-5',
    };
  }

  return {
    domains: 'order-1',
    deltaDomains: 'order-2',
    ventures: 'order-3',
    coVentures: 'order-4',
    auctions: 'order-5',
  };
}

export default function ExploreSection({ searchMode = 'new' }) {
  const { t } = useTranslation();
  const rowOrder = exploreLeadRowOrder(searchMode);

  return (
    <>
      <div className="flex flex-col">
        <div className={rowOrder.domains}>
          <FeaturedDomainsSection />
        </div>
        <div className={rowOrder.deltaDomains}>
          <IndependentSection
            title={t('homeDomainRegister', { defaultValue: 'Delta Domains' })}
            to="/domains"
            accent="domain"
          >
            <DomainsSection />
          </IndependentSection>
        </div>

        <div className={rowOrder.ventures}>
          <IndependentSection title={t('homeVentureRegister', { defaultValue: 'Ventures' })} to="/ventures" accent="venture">
            <VenturesSection />
          </IndependentSection>
        </div>

        <div className={rowOrder.coVentures}>
          <IndependentSection
            title={t('homeCoVenturesRegister', { defaultValue: 'Delta Ventures' })}
            to="/ventures?mode=co-venture"
            compact
            accent="coventure"
          >
            <CoVenturesSection />
          </IndependentSection>
        </div>

        <div className={rowOrder.auctions}>
          <IndependentSection title={t('homeRegistryAuctions', { defaultValue: 'Auctions' })} to="/auctions" variant="auction" accent="auction">
            <AuctionsSection />
          </IndependentSection>
        </div>
      </div>

      <IndependentSection title={t('homeTechnologyRegister', { defaultValue: 'DeltaOs (Operating System)' })} to="/technology" accent="technology">
        <TechnologySection />
      </IndependentSection>

      {HOMEPAGE_OPERATIONS_SECTIONS.map((section) => (
        <IndependentSection
          key={section.id}
          title={section.homeLabel || t(section.labelKey, { defaultValue: section.defaultLabel })}
          to={operationsPathForSection(section.id)}
          compact
          accent={section.id === 'assistance' ? 'assistance' : 'operations'}
        >
          <HomeOperationsCarouselSection sectionId={section.id} />
        </IndependentSection>
      ))}

      <IndependentSection
        title={t('homeRegistrationsTitle', { defaultValue: 'Delta Registrations' })}
        to="/registrations"
        compact
        accent="operations"
      >
        <HomeRegistrationsSection />
      </IndependentSection>

      <IndependentSection title="Deltapreneur" to="/community" compact accent="community">
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
