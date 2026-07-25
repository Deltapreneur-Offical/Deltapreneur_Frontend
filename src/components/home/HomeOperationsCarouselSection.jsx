import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { operationsAPI } from '../../api/services';
import { asArray } from '../../utils/asArray';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import { OPERATIONS_SECTIONS, operationsPathForSection } from '../../utils/operationsSections';
import FeaturedVirtualAssistantsListing from '../virtual-assistant/FeaturedVirtualAssistantsListing';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeOperationsPreviewCard from './HomeOperationsPreviewCard';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import OperationsRequestModal from '../operations/OperationsRequestModal';
import OperationsRequestSuccess from '../operations/OperationsRequestSuccess';

/**
 * Homepage Operations carousel section (Virtual Assistance or Compliance).
 *
 * Virtual Assistance shows Featured Virtual Assistant profiles (published + featured).
 * Business Solutions (Compliance) continues to use the operations services catalog.
 */
export default function HomeOperationsCarouselSection({ sectionId }) {
  const { t } = useTranslation();
  const section = OPERATIONS_SECTIONS.find((s) => s.id === sectionId) || OPERATIONS_SECTIONS[0];
  const isAssistanceSection = sectionId === 'assistance';

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(null);

  useEffect(() => {
    if (isAssistanceSection) return undefined;

    let cancelled = false;
    setLoading(true);

    operationsAPI
      .list({ serviceType: section.serviceType })
      .then(({ data }) => {
        if (!cancelled) setServices(asArray(data));
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAssistanceSection, section.serviceType]);

  const title = t(section.labelKey, { defaultValue: section.defaultLabel });
  const shouldAutoScroll = useShouldAutoScroll(services.length);

  const renderServiceCard = (service) => (
    <HomePreviewCardShell accent="operations">
      <HomeOperationsPreviewCard service={service} onHire={(s) => setRequestTarget(s)} />
    </HomePreviewCardShell>
  );

  if (isAssistanceSection) {
    return (
      <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
        <div className="w-full min-w-0">
          <HomeSectionHeader title={title} to={operationsPathForSection(sectionId)} />
          <FeaturedVirtualAssistantsListing
            layout="row"
            pageSize={20}
            ariaLabel={title}
            loadingFallback={(
              <HomeSectionCardSkeleton
                title={title}
                to={operationsPathForSection(sectionId)}
                hideHeader
                compact
              />
            )}
          />
        </div>
      </section>
    );
  }

  if (loading) {
    return <HomeSectionCardSkeleton title={title} to={operationsPathForSection(sectionId)} />;
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={title} to={operationsPathForSection(sectionId)} />

        {services.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {t('operationsHomeEmpty', { defaultValue: 'No services available yet.' })}
          </p>
        ) : shouldAutoScroll ? (
          <HomeAutoScrollRow durationSec={50} ariaLabel={title}>
            {services.map((service) => (
              <HomeAutoScrollRowItem key={service.id}>
                {renderServiceCard(service)}
              </HomeAutoScrollRowItem>
            ))}
          </HomeAutoScrollRow>
        ) : (
          <HomePreviewRow>
            {services.map((service) => (
              <HomePreviewRowItem key={service.id}>
                {renderServiceCard(service)}
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>

      {requestTarget && (
        <OperationsRequestModal
          service={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSuccess={(payload) => {
            setRequestTarget(null);
            setRequestSuccess(payload);
          }}
        />
      )}

      {requestSuccess && (
        <OperationsRequestSuccess payload={requestSuccess} onClose={() => setRequestSuccess(null)} />
      )}
    </section>
  );
}
