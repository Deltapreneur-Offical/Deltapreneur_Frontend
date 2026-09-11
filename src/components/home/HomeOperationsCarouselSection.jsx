import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { operationsAPI, hubRegistrarOfficeAPI } from '../../api/services';
import { asArray } from '../../utils/asArray';
import { OPERATIONS_SECTIONS, operationsPathForSection } from '../../utils/operationsSections';
import FeaturedVirtualAssistantsListing, {
  useFeaturedVirtualAssistants,
} from '../virtual-assistant/FeaturedVirtualAssistantsListing';
import HomePreviewCardShell from './HomePreviewCardShell';
import HubRegistrarOfficeCard from '../listings/HubRegistrarOfficeCard';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeOperationsPreviewCard from './HomeOperationsPreviewCard';
import HomeCardsNavRow from './HomeCardsNavRow';
import { HomePreviewRowItem } from './HomePreviewRow';
import OperationsRequestModal from '../operations/OperationsRequestModal';
import OperationsRequestSuccess from '../operations/OperationsRequestSuccess';

/**
 * Homepage Operations carousel section (Virtual Assistance or Compliance).
 *
 * Virtual Assistance shows only profiles enabled in Admin → Homepage Features.
 * Business Solutions (Compliance) continues to use the operations services catalog.
 */
export default function HomeOperationsCarouselSection({ sectionId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const section = OPERATIONS_SECTIONS.find((s) => s.id === sectionId) || OPERATIONS_SECTIONS[0];
  const isAssistanceSection = sectionId === 'assistance';
  const isOfficesSection = sectionId === 'offices';

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(null);

  const vaFeatured = useFeaturedVirtualAssistants(48, {
    enabled: isAssistanceSection,
    featuredOnly: true,
  });
  const [offices, setOffices] = useState([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    if (isOfficesSection) {
      setOfficesLoading(true);
      hubRegistrarOfficeAPI.list()
        .then(({ data }) => {
          setOffices(data.data || []);
        })
        .catch(() => {
          setOffices([]);
        })
        .finally(() => {
          setOfficesLoading(false);
        });
      return;
    }

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
  }, [isAssistanceSection, isOfficesSection, section.serviceType]);

  const title = section.homeLabel || t(section.labelKey, { defaultValue: section.defaultLabel });
  const accent = isAssistanceSection ? 'assistance' : 'operations';
  const viewAllPath = operationsPathForSection(sectionId);

  const openServiceRequest = (service) => {
    operationsAPI.get(service.id)
      .then(({ data }) => {
        const fresh = data?.data ?? data;
        if (fresh?.views != null) {
          setServices((prev) => prev.map((s) => (
            String(s.id) === String(service.id) ? { ...s, views: fresh.views } : s
          )));
        }
      })
      .catch(() => {});
    setRequestTarget(service);
  };

  const renderServiceCard = (service) => (
    <HomePreviewCardShell accent="operations">
      <HomeOperationsPreviewCard service={service} onHire={openServiceRequest} />
    </HomePreviewCardShell>
  );

  if (isAssistanceSection) {
    if (vaFeatured.loading) {
      return (
        <HomeSectionCardSkeleton
          title={title}
          to={viewAllPath}
          accent={accent}
          compact
        />
      );
    }

    return (
      <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
        <div className="w-full min-w-0">
          <HomeSectionHeader
            title={title}
            to={viewAllPath}
            accent={accent}
            showViewAll={vaFeatured.count > 0}
          />
          <FeaturedVirtualAssistantsListing
            layout="row"
            pageSize={20}
            cards={vaFeatured.cards}
            loading={false}
            ariaLabel={title}
          />
        </div>
      </section>
    );
  }

  if (isOfficesSection) {
    const filteredOffices = offices.filter((office) => {
      if (!cityFilter.trim()) return true;
      const searchTerm = cityFilter.toLowerCase();
      return (
        (office.city && office.city.toLowerCase().includes(searchTerm)) ||
        (office.full_address && office.full_address.toLowerCase().includes(searchTerm))
      );
    });

    return (
      <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
        <div className="w-full min-w-0">
          <header className="home-section-header home-section-header--operations">
            <div className="home-section-header__top">
              <h2 className="home-section-header__title text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
              <div className="hro-header-right">
                <div className="hro-city-filter-wrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-city-filter-icon">
                    <circle cx="11" cy="11" r="8"/>
                    <path strokeLinecap="round" d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    className="hro-city-filter-input"
                    placeholder={t('searchByCity', { defaultValue: 'Search by city...' })}
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                  />
                  {cityFilter && (
                    <button
                      type="button"
                      className="hro-city-filter-clear"
                      onClick={() => setCityFilter('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
                {offices.length > 0 && (
                  <Link to={viewAllPath} className="home-section-header__view-all">
                    <span>{t('viewAll', { defaultValue: 'View All' })}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="home-section-header__view-all-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </header>

          {officesLoading ? (
            <HomeSectionCardSkeleton title={title} to={viewAllPath} accent="operations" compact />
          ) : offices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {t('noOfficesYet', { defaultValue: 'No offices available yet. Check back soon!' })}
              </p>
            </div>
          ) : filteredOffices.length === 0 ? (
            <div className="hro-no-results">
              <div className="hro-no-results-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="hro-no-results-title">
                {t('noOfficesFoundIn', { defaultValue: 'No offices found in' })} "{cityFilter}"
              </p>
              <p className="hro-no-results-desc">
                {t('comingToCitySoon', { defaultValue: 'We will be coming to that city soon! Try searching for a different city.' })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOffices.map((office) => (
                <HubRegistrarOfficeCard key={office.id} office={office} compact />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <HomeSectionCardSkeleton
        title={title}
        to={viewAllPath}
        accent={accent}
      />
    );
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={title}
          to={viewAllPath}
          accent={accent}
          showViewAll={services.length > 0}
        />

        {services.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {t('operationsHomeEmpty', { defaultValue: 'No services available yet.' })}
          </p>
        ) : (
          <HomeCardsNavRow accent="operations" ariaLabel={title}>
            {services.map((service) => (
              <HomePreviewRowItem key={service.id}>
                {renderServiceCard(service)}
              </HomePreviewRowItem>
            ))}
          </HomeCardsNavRow>
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
          onTrack={() => {
            const section = requestSuccess?.type === 'booking' ? 'compliance' : 'assistance';
            setRequestSuccess(null);
            navigate(`/operations?section=${section}#operations-my-requests`);
          }}
        />
      )}
    </section>
  );
}
