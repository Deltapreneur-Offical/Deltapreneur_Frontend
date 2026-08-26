import { useEffect, useMemo, useState } from 'react';
import { Mail, ShieldCheck, Globe, ArrowRightLeft, RotateCcw, Sparkles, Shield, Filter } from 'lucide-react';
import ServiceCard from './ServiceCard';
import EmailForm from './EmailForm';
import SSLForm from './SSLForm';
import DNSSECForm from './DNSSECForm';
import TransferForm from './TransferForm';
import RenewalForm from './RenewalForm';
import RestoreForm from './RestoreForm';
import EasyDmarcForm from './EasyDmarcForm';
import SpamExpertsForm from './SpamExpertsForm';
import { domainStorefrontAPI } from '../../api/services';
import { readApiError } from '../../utils/apiError';
import { useTranslation } from 'react-i18next';

const services = [
  {
    id: 'email',
    icon: <Mail className="w-6 h-6 text-[#2563EB] stroke-[#2563EB]" />,
    name: 'Professional Email',
    tag: 'Mailbox',
    unit: 'month',
    price: 'From catalog',
    bullets: [
      'yourname@yourbrand.com',
      'Spam & malware filters',
      'Webmail + mobile access',
      '5 GB storage per mailbox',
    ],
    Component: EmailForm,
    apiMethod: 'purchaseEmail',
  },
  {
    id: 'ssl',
    icon: <ShieldCheck className="w-6 h-6 text-[#2563EB] stroke-[#2563EB]" />,
    name: 'SSL Certificate',
    tag: 'HTTPS',
    unit: 'yr',
    price: '—',
    bullets: [
      'Standard & Wildcard SSL',
      'Browser padlock enabled',
      'Auto-renew support',
      '256-bit encryption',
    ],
    Component: SSLForm,
    apiMethod: 'purchaseSSL',
  },
  {
    id: 'restore',
    icon: <RotateCcw className="w-6 h-6 text-[#2563EB] stroke-[#2563EB]" />,
    name: 'Domain Restore',
    tag: 'Redemption',
    unit: 'yr',
    price: 'Live quote',
    bullets: [
      'Recover domains in redemption',
      'Live restore price',
      'Secure ownership before delete',
      'Pay once & restore via registrar',
    ],
    Component: RestoreForm,
    apiMethod: null,
  },
  {
    id: 'easydmarc',
    icon: <Shield className="w-6 h-6 text-[#2563EB] stroke-[#2563EB]" />,
    name: 'EasyDMARC',
    tag: 'DMARC',
    unit: 'yr',
    price: 'From catalog',
    bullets: [
      'Stop brand email spoofing',
      'DMARC DNS record guidance',
      'EasyDMARC order',
      'SSO access to DMARC panel',
    ],
    Component: EasyDmarcForm,
    apiMethod: null,
  },
  {
    id: 'spamexperts',
    icon: <Filter className="w-6 h-6 text-[#2563EB] stroke-[#2563EB]" />,
    name: 'SpamExperts',
    tag: 'Filter',
    unit: 'yr',
    price: 'From catalog',
    bullets: [
      'Incoming spam & malware filter',
      'Protect your domain mailbox',
      'Control-panel login after setup',
      'Managed via HubRegistrar',
    ],
    Component: SpamExpertsForm,
    apiMethod: null,
  },
  {
    id: 'dnssec',
    icon: <Globe className="w-6 h-6 text-[#2563EB] stroke-[#2563EB]" />,
    name: 'DNSSEC',
    tag: 'Free',
    unit: 'setup',
    price: 'Free',
    bullets: [
      'Cryptographic DNS signing',
      'Prevent cache poisoning',
      'Anti-spoofing protection',
      'One-click activation',
    ],
    Component: DNSSECForm,
    apiMethod: 'toggleDnssec',
  },
  {
    id: 'transfer',
    icon: <ArrowRightLeft className="w-6 h-6 text-[#2563EB] stroke-[#2563EB]" />,
    name: 'Domain Transfer',
    tag: 'All TLDs',
    unit: 'yr',
    price: '—',
    bullets: [
      '.com, .in, .net, .org & more',
      'Free EPP-code transfer',
      'Zero downtime migration',
      'Auto-sync DNS settings',
    ],
    Component: TransferForm,
    apiMethod: 'initiateTransfer',
  },
  {
    id: 'renewal',
    icon: <Sparkles className="w-6 h-6 text-[#2563EB] stroke-[#2563EB]" />,
    name: 'Domain Renewal',
    tag: 'Multi-year',
    unit: 'yr',
    price: '—',
    bullets: [
      'Lock domain for up to 10 yrs',
      'Expiry alerts via email',
      'Auto-renew option available',
      'Instant registry update',
    ],
    Component: RenewalForm,
    apiMethod: 'renewDomainDirect',
  },
];

function hasRegisteredDomains(orders) {
  return Array.isArray(orders) && orders.length > 0;
}

export default function DomainServices({ orders, ordersLoading = false }) {
  const [selectedService, setSelectedService] = useState(null);
  const [priceLabels, setPriceLabels] = useState({});
  const [tldPrices, setTldPrices] = useState({});
  const { t } = useTranslation();

  useEffect(() => {
    domainStorefrontAPI.getPrices()
      .then(({ data }) => {
        const prices = data?.data ?? data;
        setPriceLabels({
          transfer: prices?.transfer?.label,
          renewal: prices?.renewal?.label,
          email: prices?.email?.label,
          ssl: prices?.ssl?.label,
          restore: prices?.restore?.label,
          easydmarc: prices?.easydmarc?.label,
          spamexperts: prices?.spamexperts?.label,
          dnssec: prices?.dnssec?.label,
        });
        setTldPrices({
          transfer: prices?.transfer?.byTld,
          renewal: prices?.renewal?.byTld,
        });
      })
      .catch(() => {});
  }, []);

  const pricedServices = useMemo(
    () => services.map((service) => ({
      ...service,
      price: priceLabels[service.id] || service.price,
    })),
    [priceLabels],
  );

  const handleServiceSubmit = async (apiMethod, formData) => {
    const api = domainStorefrontAPI[apiMethod];
    if (!api) {
      console.warn(`API method ${apiMethod} not yet implemented.`);
      return;
    }

    let response;
    switch (apiMethod) {
      case 'purchaseEmail':
        response = await api(formData.orderId, formData.mailbox);
        break;
      case 'purchaseSSL':
        response = await api(formData.orderId, formData);
        break;
      case 'toggleDnssec':
        response = await api(formData.orderId, formData.enabled);
        break;
      case 'initiateTransfer':
        response = await api(formData);
        break;
      case 'renewDomainDirect':
        response = await api(formData.orderId, formData.period);
        break;
      default:
        response = await api(formData);
        break;
    }

    return response?.data ?? response;
  };

  const renderForm = (service) => {
    const commonProps = {
      onClose: () => setSelectedService(null),
      onSubmit: (formData) => handleServiceSubmit(service.apiMethod, formData),
      orders,
    };

    switch (service.id) {
      case 'email':
        return <EmailForm {...commonProps} onSubmit={undefined} />;
      case 'ssl':
        return <SSLForm {...commonProps} onSubmit={undefined} />;
      case 'restore':
        return <RestoreForm {...commonProps} onSubmit={undefined} />;
      case 'easydmarc':
        return <EasyDmarcForm {...commonProps} onSubmit={undefined} />;
      case 'spamexperts':
        return <SpamExpertsForm {...commonProps} onSubmit={undefined} />;
      case 'dnssec':
        return <DNSSECForm {...commonProps} />;
      case 'transfer':
        return <TransferForm {...commonProps} onSubmit={undefined} />;
      case 'renewal':
        return <RenewalForm {...commonProps} onSubmit={undefined} />;
      default:
        return null;
    }
  };

  const userHasRegisteredDomains = hasRegisteredDomains(orders);

  const handleConfigure = (serviceId) => {
    setSelectedService((current) => (current === serviceId ? null : serviceId));
  };

  return (
    <section className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Domain Services</h2>
            <p className="text-xs text-gray-500">
              Enhance, secure, and manage your domains with our add-on services.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pricedServices.map((service) => {
            const isActive = selectedService === service.id;
            const showNoDomainsOverlay = isActive
              && !ordersLoading
              && !userHasRegisteredDomains;

            return (
              <ServiceCard
                key={service.id}
                icon={service.icon}
                name={service.name}
                tag={service.tag}
                unit={service.unit}
                bullets={service.bullets}
                price={service.price}
                hasDomains={userHasRegisteredDomains}
                tldPrices={service.id === 'transfer' ? tldPrices.transfer : undefined}
                tldRenewPrices={service.id === 'renewal' ? tldPrices.renewal : undefined}
                onConfigure={() => handleConfigure(service.id)}
                isActive={isActive}
                noDomainsOverlay={showNoDomainsOverlay}
              >
                {isActive && renderForm(service)}
              </ServiceCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
