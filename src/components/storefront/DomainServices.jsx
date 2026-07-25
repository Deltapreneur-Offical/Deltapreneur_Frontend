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
    icon: <Mail className="w-6 h-6" />,
    name: 'Professional Email',
    description: 'Create branded email addresses with your domain. Includes spam filtering and webmail access.',
    price: '₹49/month',
    priceAvailable: true,
    Component: EmailForm,
    apiMethod: 'purchaseEmail',
  },
  {
    id: 'ssl',
    icon: <ShieldCheck className="w-6 h-6" />,
    name: 'SSL Certificate',
    description: 'Secure your website with industry-standard SSL encryption. Boost trust and SEO rankings.',
    price: '—',
    priceAvailable: true,
    Component: SSLForm,
    apiMethod: 'purchaseSSL',
  },
  {
    id: 'restore',
    icon: <RotateCcw className="w-6 h-6" />,
    name: 'Domain Restore',
    description: 'Restore a domain in redemption period through OpenProvider before it is permanently deleted.',
    price: 'Live quote',
    priceAvailable: true,
    Component: RestoreForm,
    apiMethod: null,
  },
  {
    id: 'easydmarc',
    icon: <Shield className="w-6 h-6" />,
    name: 'EasyDMARC',
    description: 'Protect your brand from spoofing with DMARC monitoring and reporting via OpenProvider.',
    price: '₹499/yr',
    priceAvailable: true,
    Component: EasyDmarcForm,
    apiMethod: null,
  },
  {
    id: 'spamexperts',
    icon: <Filter className="w-6 h-6" />,
    name: 'SpamExperts',
    description: 'Incoming email filtering for your domain with a control-panel login link after activation.',
    price: '₹299/yr',
    priceAvailable: true,
    Component: SpamExpertsForm,
    apiMethod: null,
  },
  {
    id: 'dnssec',
    icon: <Globe className="w-6 h-6" />,
    name: 'DNSSEC',
    description: 'Add an extra layer of security to your DNS with cryptographic signatures. Prevent DNS spoofing attacks.',
    price: 'Free',
    priceAvailable: true,
    Component: DNSSECForm,
    apiMethod: 'toggleDnssec',
  },
  {
    id: 'transfer',
    icon: <ArrowRightLeft className="w-6 h-6" />,
    name: 'Domain Transfer',
    description: 'Transfer your existing domain to CoBrother with seamless migration and 1-year extension.',
    price: '—',
    priceAvailable: true,
    Component: TransferForm,
    apiMethod: 'initiateTransfer',
  },
  {
    id: 'renewal',
    icon: <Sparkles className="w-6 h-6" />,
    name: 'Domain Renewal',
    description: 'Renew your domain registration before expiry to avoid downtime and retain ownership.',
    price: '—',
    priceAvailable: true,
    Component: RenewalForm,
    apiMethod: 'renewDomainDirect',
  },
];

export default function DomainServices({ orders }) {
  const [selectedService, setSelectedService] = useState(null);
  const [priceLabels, setPriceLabels] = useState({});
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

  return (
    <section className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
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
          {pricedServices.map((service) => (
            <ServiceCard
              key={service.id}
              icon={service.icon}
              name={service.name}
              description={service.description}
              price={service.price}
              priceAvailable={service.priceAvailable}
              onConfigure={() => setSelectedService(selectedService === service.id ? null : service.id)}
              isActive={selectedService === service.id}
            >
              {selectedService === service.id && renderForm(service)}
            </ServiceCard>
          ))}
        </div>
      </div>
    </section>
  );
}
