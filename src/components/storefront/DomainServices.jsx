import { useState } from 'react';
import { Mail, ShieldCheck, Globe, ArrowRightLeft, RotateCcw, Sparkles } from 'lucide-react';
import ServiceCard from './ServiceCard';
import EmailForm from './EmailForm';
import SSLForm from './SSLForm';
import DNSSECForm from './DNSSECForm';
import TransferForm from './TransferForm';
import RenewalForm from './RenewalForm';
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
    price: '₹299/year',
    priceAvailable: true,
    Component: SSLForm,
    apiMethod: 'purchaseSSL',
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
    price: '₹699/year',
    priceAvailable: true,
    Component: TransferForm,
    apiMethod: 'initiateTransfer',
  },
  {
    id: 'renewal',
    icon: <RotateCcw className="w-6 h-6" />,
    name: 'Domain Renewal',
    description: 'Renew your domain registration before expiry to avoid downtime and retain ownership.',
    price: '₹599/year',
    priceAvailable: true,
    Component: RenewalForm,
    apiMethod: 'renewDomainDirect',
  },
];

export default function DomainServices({ orders }) {
  const [selectedService, setSelectedService] = useState(null);
  const { t } = useTranslation();

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
        return <EmailForm {...commonProps} />;
      case 'ssl':
        return <SSLForm {...commonProps} />;
      case 'dnssec':
        return <DNSSECForm {...commonProps} />;
      case 'transfer':
        return <TransferForm {...commonProps} />;
      case 'renewal':
        return <RenewalForm {...commonProps} />;
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
          {services.map((service) => (
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
