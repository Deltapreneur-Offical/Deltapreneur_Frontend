import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { operationsAPI } from '../../api/services';
import { asArray } from '../../utils/asArray';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import { OPERATIONS_SECTIONS, operationsPathForSection } from '../../utils/operationsSections';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import HomeOperationsPreviewCard from './HomeOperationsPreviewCard';
import OperationsRequestModal from '../operations/OperationsRequestModal';
import OperationsRequestSuccess from '../operations/OperationsRequestSuccess';

/**
 * Homepage Operations carousel section (Virtual Assistance or Compliance).
 *
 * Mirrors the existing Technologies section exactly:
 *  - same horizontal carousel / auto-scroll row
 *  - same card width, spacing and left/right scrolling behavior
 *  - same "View All" header button
 *  - same responsive layout and loading skeleton
 *
 * Cards are the HomeOperationsPreviewCard (with its Hire / Book button) and
 * the Hire button opens the identical OperationsRequestModal used on the Operations
 * page — no navigation to the Operations page.
 */
export default function HomeOperationsCarouselSection({ sectionId }) {
  const { t } = useTranslation();
  const section =
    OPERATIONS_SECTIONS.find((s) => s.id === sectionId) || OPERATIONS_SECTIONS[0];

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(null);

  useEffect(() => {
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
  }, [section.serviceType]);

  const title = t(section.labelKey, { defaultValue: section.defaultLabel });
  const accent = sectionId === 'compliance' ? 'compliance' : 'operations';
  const shouldAutoScroll = useShouldAutoScroll(services.length);

  const renderCard = (service) => (
    <HomePreviewCardShell accent={accent}>
      <HomeOperationsPreviewCard
        service={service}
        onHire={(s) => setRequestTarget(s)}
      />
    </HomePreviewCardShell>
  );

  if (loading) {
    return (
      <HomeSectionCardSkeleton
        title={title}
        to={operationsPathForSection(sectionId)}
      />
    );
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={title}
          to={operationsPathForSection(sectionId)}
        />
        {services.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {t('operationsHomeEmpty', { defaultValue: 'No services available yet.' })}
          </p>
        ) : shouldAutoScroll ? (
          <HomeAutoScrollRow durationSec={50} ariaLabel={title}>
            {services.map((service) => (
              <HomeAutoScrollRowItem key={service.id}>
                {renderCard(service)}
              </HomeAutoScrollRowItem>
            ))}
          </HomeAutoScrollRow>
        ) : (
          <HomePreviewRow>
            {services.map((service) => (
              <HomePreviewRowItem key={service.id}>
                {renderCard(service)}
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
        <OperationsRequestSuccess
          payload={requestSuccess}
          onClose={() => setRequestSuccess(null)}
        />
      )}
    </section>
  );
}
