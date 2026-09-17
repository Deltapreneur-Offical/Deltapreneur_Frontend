import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { technologyServicesAPI } from '../api/technologyServicesApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import AppOverlay from '../components/common/AppOverlay';
import {
  Cpu,
  Layout,
  Users,
  FileText,
  Calendar,
  Edit3,
  HardDrive,
  Phone,
  Shield,
  Mail,
  Share2,
  Star,
  Link as LinkIcon,
  TrendingUp,
  Wifi,
  Server,
  Box,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  Lock,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const TECH_SUBSCRIBE_FIELD =
  'tech-subscribe-modal__field w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-900 caret-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500';

const ICON_MAP = {
  Cpu,
  Layout,
  Users,
  FileText,
  Calendar,
  Edit3,
  HardDrive,
  Phone,
  Shield,
  Mail,
  Share2,
  Star,
  Link: LinkIcon,
  TrendingUp,
  Wifi,
  Server,
  Box,
};

function extractTechnologyServiceSlug(pathname = '') {
  const match = String(pathname || '').match(/^\/technolog(?:y|ies)\/(?:services\/)?([^/?#]+)\/?$/i);
  return match?.[1] || '';
}

export default function TechnologyServiceDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { formatPrice, convertToInr } = useCurrency();

  /** Tech catalogue prices are stored in USD; convert via INR for the selected header currency. */
  const formatTechPrice = (usdAmount) =>
    formatPrice(convertToInr(Number(usdAmount) || 0, 'USD'));

  const slug = params.slug || extractTechnologyServiceSlug(location.pathname);

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const [purchasingPlan, setPurchasingPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [purchasedSuccess, setPurchasedSuccess] = useState(null);
  const [mySubscription, setMySubscription] = useState(null);

  // Provisioning input required for specific provider-powered services:
  // Some provider-powered services need customer/provider inputs before payment.
  const [areaCode, setAreaCode] = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [providerInputs, setProviderInputs] = useState({});
  const [inputError, setInputError] = useState(null);

  const setProviderField = (key, value) => {
    setProviderInputs((current) => ({ ...current, [key]: value }));
    setInputError(null);
  };

  useEffect(() => {
    let isMounted = true;
    const targetSlug = slug;

    // Safety timeout (5 seconds) to prevent infinite loading spinner under any network state
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        const apiUrl = `/api/v1/technology-services/${targetSlug}`;
        console.warn(`[TechnologyServiceDetailPage] Safety timeout (5s) reached for API: ${apiUrl}`);
        setError(t('techDetailTimeout', { defaultValue: 'Request timed out while loading technology service details.' }));
        setLoading(false);
      }
    }, 5000);

    const fetchServiceAndSub = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!targetSlug) {
          console.error('[TechnologyServiceDetailPage] Missing slug in route');
          if (isMounted) {
            setError(t('techDetailMissingId', { defaultValue: 'Technology service identifier is missing.' }));
            setLoading(false);
          }
          clearTimeout(timeoutId);
          return;
        }

        const apiUrl = `/api/v1/technology-services/${targetSlug}`;
        console.log(`[TechnologyServiceDetailPage] Calling API: ${apiUrl} (slug: ${targetSlug})`);

        const res = await technologyServicesAPI.getServiceBySlug(targetSlug);
        console.log(`[TechnologyServiceDetailPage] Response for ${apiUrl} -> Status: ${res.status || 200}`, res.data || res);

        const data = res.data || res;
        if (!data || (!data.slug && !data.id)) {
          if (isMounted) {
            setError(t('techDetailNotFound', { defaultValue: 'Technology service not found.' }));
            setService(null);
          }
        } else if (isMounted) {
          setService(data);
          setError(null);

          // Background check for existing subscription
          if (user?.id) {
            try {
              const subsRes = await technologyServicesAPI.getMySubscriptions();
              const subs = subsRes.data || subsRes || [];
              const active = subs.find((s) => s.service_slug === targetSlug && s.status === 'ACTIVE');
              if (active && isMounted) setMySubscription(active);
            } catch (subErr) {
              console.warn('[TechnologyServiceDetailPage] Subscriptions check error:', subErr);
            }
          }
        }
      } catch (err) {
        const apiUrl = `/api/v1/technology-services/${targetSlug}`;
        console.error(`[TechnologyServiceDetailPage] Error calling API ${apiUrl}:`, err);
        if (isMounted) {
          setError(err?.response?.data?.detail || t('techDetailNotFound', { defaultValue: 'Technology service not found.' }));
          setService(null);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchServiceAndSub();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [slug]);

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!purchasingPlan || !service) return;

    const planCode = purchasingPlan.code || purchasingPlan.key || 'starter';
    const metadata = {
      productName: service.name,
      serviceSlug: service.slug,
      billingCycle,
      planCode,
    };

    if (service.provider_product_key) {
      metadata.providerProductKey = service.provider_product_key;
    }
    if (service.provider_specific_params) {
      Object.assign(metadata, service.provider_specific_params);
    }

    const slug = String(service.slug || '').toLowerCase();
    const requireValue = (key, message) => {
      const value = String(providerInputs[key] || '').trim();
      if (!value) {
        setInputError(message);
        return '';
      }
      return value;
    };

    if (slug === 'ai-business-suite') {
      const rawTools = requireValue('aiTools', 'Please enter at least one ResellPortal AI tool code.');
      if (!rawTools) return;
      metadata.aiTools = rawTools.split(',').map((item) => item.trim()).filter(Boolean);
    }
    if (slug === 'cloud-storage') {
      const storagePlan = requireValue('storagePlan', 'Please select a cloud storage plan.');
      if (!storagePlan) return;
      metadata.storagePlan = storagePlan;
    }
    if (slug === 'document-signer') {
      const companyName = requireValue('companyName', 'Please enter the company name for Document Signer.');
      if (!companyName) return;
      metadata.companyName = companyName;
    }
    if (slug === 'email-marketing') {
      const allowedPlans = new Set(['starter', 'growth', 'pro', 'business']);
      if (!allowedPlans.has(planCode)) {
        setInputError('This Email Marketing plan is not mapped to a ResellPortal sending plan yet. Please choose Starter or Pro.');
        return;
      }
      metadata.sendingPlan = planCode;
    }
    if (slug === 'invoice-ai' || slug === 'appointment-booking') {
      const subdomain = requireValue('subdomain', 'Please enter a subdomain for this service.');
      if (!subdomain) return;
      metadata.subdomain = subdomain.toLowerCase();
      if (providerInputs.businessName) metadata.businessName = String(providerInputs.businessName).trim();
      if (providerInputs.logoUrl) metadata.logoUrl = String(providerInputs.logoUrl).trim();
      if (providerInputs.primaryColor) metadata.primaryColor = String(providerInputs.primaryColor).trim();
      if (slug === 'appointment-booking' && providerInputs.secondaryColor) {
        metadata.secondaryColor = String(providerInputs.secondaryColor).trim();
      }
    }
    if (slug === 'business-phone') {
      const code = String(areaCode || '').trim();
      if (!code) {
        setInputError(t('techDetailPhoneAreaCode', { defaultValue: 'Please enter the area code for your Business Phone number.' }));
        return;
      }
      metadata.areaCode = code;
    }
    if (slug === 'web-hosting') {
      const domain = String(primaryDomain || '').trim().toLowerCase();
      if (!domain || !domain.includes('.')) {
        setInputError(t('techDetailDomainRequired', { defaultValue: 'Please enter the primary domain for your hosting account.' }));
        return;
      }
      metadata.primaryDomain = domain;
    }
    if (slug === 'smm-growth') {
      const serviceId = requireValue('serviceId', 'Please enter the ResellPortal SMM service ID.');
      const link = requireValue('link', 'Please enter the social media link to promote.');
      const quantity = Number(providerInputs.quantity || 0);
      if (!serviceId || !link) return;
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setInputError('Please enter a valid SMM quantity.');
        return;
      }
      metadata.serviceId = serviceId;
      metadata.link = link;
      metadata.quantity = quantity;
    }
    if (slug === 'esim') {
      const packageCode = requireValue('packageCode', 'Please enter the ResellPortal eSIM package code.');
      if (!packageCode) return;
      metadata.packageCode = packageCode;
    }
    if (slug === 'wordpress-plugin-pack') {
      const pluginName = requireValue('pluginName', 'Please enter the plugin name.');
      const author = requireValue('author', 'Please enter the plugin author.');
      const description = requireValue('description', 'Please enter the plugin description.');
      const logoUrl = requireValue('logoUrl', 'Please enter the plugin logo URL.');
      if (!pluginName || !author || !description || !logoUrl) return;
      metadata.pluginName = pluginName;
      metadata.author = author;
      metadata.description = description;
      metadata.logoUrl = logoUrl;
    }

    try {
      setSubmitting(true);

      await addItem('TECHNOLOGY', service.id, {
        selectedPlan: planCode,
        coBrotherOptIn: false,
        metadata,
      });
      setPurchasingPlan(null);
      navigate('/cart');
    } catch (err) {
      alert(err?.response?.data?.detail || t('techDetailCartFailed', { defaultValue: 'Failed to add to cart. Please try again.' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent mb-4" />
          <p className="text-sm font-semibold text-gray-700">Loading Deltapreneur Technology Service...</p>
          <p className="text-xs text-gray-400 mt-1">Connecting to Deltapreneur REST API...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !service) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <Box className="h-8 w-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Technology Not Found</h2>
          <p className="mt-2 text-sm text-gray-600 max-w-md">
            {error || t('techDetailUnavailable', { defaultValue: 'The requested technology service does not exist or is currently unavailable.' })}
          </p>
          <button
            onClick={() => navigate('/technology', { replace: true })}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Technologies Catalogue
          </button>
        </div>
      </AppLayout>
    );
  }

  const IconComponent = (service.icon && ICON_MAP[service.icon]) || Box;

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen pb-16">
        
        {/* Top Header / Hero */}
        <div className="bg-gradient-to-b from-[#431407] via-[#7c2d12] to-[#431407] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-orange-400/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="mx-auto max-w-7xl relative z-10">
            {/* Back Link */}
            <button
              onClick={() => navigate('/technology', { replace: true })}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Technologies
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-orange-200 border border-orange-200/20 shadow-lg">
                    <IconComponent className="h-8 w-8" />
                  </div>
                  <div>
                    <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-100 border border-orange-300/30 uppercase tracking-wider">
                      {service.category}
                    </span>
                    {service.badge && (
                      <span className="ml-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
                        {service.badge}
                      </span>
                    )}
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
                  {service.name}
                </h1>
                <p className="text-lg text-gray-300 leading-relaxed">
                  {service.long_description || service.short_description}
                </p>
              </div>

              {/* Action Card / Subscribed Badge */}
              <div className="shrink-0 bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
                {mySubscription ? (
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="h-4 w-4" />
                      Active Subscription ({mySubscription.plan_code.toUpperCase()})
                    </div>
                    <p className="text-xs text-gray-300">
                      Your white-labelled service is live and fully provisioned.
                    </p>
                    <button
                      onClick={() => navigate('/technology/dashboard')}
                      className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:from-orange-700 hover:to-amber-700 transition-all transform hover:-translate-y-0.5"
                    >
                      View in My Technologies
                    </button>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-gray-300 font-medium">Starting from</span>
                    <div className="text-4xl font-extrabold text-white my-1">
                      {formatTechPrice(service.starting_price || 15)}
                      <span className="text-sm font-normal text-gray-400">/mo</span>
                    </div>
                    <p className="text-xs text-gray-300 mb-5">
                      Instant Deltapreneur provisioning. 100% white-labelled.
                    </p>
                    <a
                      href="#pricing-plans"
                      className="inline-block w-full rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-orange-700 transition-all transform hover:-translate-y-0.5"
                    >
                      View Pricing Plans
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 space-y-16">

          {/* Key Features */}
          {service.features && service.features.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Zap className="h-6 w-6 text-orange-600" />
                Key Features & Capabilities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {service.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{feat}</h4>
                      <p className="text-xs text-gray-500 mt-1">Built natively into Deltapreneur enterprise workspace engine.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Plans */}
          {service.plans && service.plans.length > 0 && (
            <div id="pricing-plans" className="scroll-mt-10">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Transparent Pricing
                </span>
                <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
                <p className="text-gray-600 text-sm mt-2">
                  Select the plan that fits your business requirements. Upgrade or cancel anytime.
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex items-center gap-3 bg-gray-200 p-1.5 rounded-full mt-6">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setBillingCycle('annually')}
                    className={`rounded-full px-5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                      billingCycle === 'annually'
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Annual Billing
                    <span className="rounded-full bg-amber-400 text-slate-900 px-2 py-0.5 text-[10px] font-extrabold">
                      20% OFF
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {service.plans.map((plan) => {
                  const isPro = plan.code === 'pro';
                  const price = billingCycle === 'annually' ? plan.price_annually : plan.price_monthly;

                  return (
                    <div
                      key={plan.code}
                      className={`relative flex flex-col justify-between rounded-3xl bg-white p-8 transition-all duration-300 ${
                        isPro
                          ? 'border-2 border-orange-600 shadow-2xl scale-105 z-10'
                          : 'border border-gray-200 shadow-sm hover:shadow-lg'
                      }`}
                    >
                      {isPro && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-700 to-amber-600 px-4 py-1 text-xs font-bold text-white shadow-md">
                          MOST POPULAR
                        </div>
                      )}

                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold tracking-tight text-gray-900">
                            {formatTechPrice(price)}
                          </span>
                          <span className="text-sm font-semibold text-gray-500">
                            /{billingCycle === 'annually' ? 'year' : 'month'}
                          </span>
                        </div>

                        <ul className="mt-6 space-y-3 border-t border-gray-100 pt-6">
                          {plan.features.map((feat, fidx) => (
                            <li key={fidx} className="flex items-center gap-3 text-sm text-gray-700">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => {
                          if (!user) {
                            navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
                            return;
                          }
                          setInputError(null);
                          setPurchasingPlan(plan);
                        }}
                        className={`mt-8 w-full rounded-xl py-3 text-sm font-bold shadow-md transition-all ${
                          isPro
                            ? 'bg-orange-700 text-white hover:bg-orange-800 shadow-orange-600/30'
                            : 'bg-orange-950 text-white hover:bg-orange-900'
                        }`}
                      >
                        Select {plan.name} Plan
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FAQs Accordion */}
          {service.faqs && service.faqs.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {service.faqs.map((faq, fidx) => {
                  const isOpen = openFaq === fidx;
                  return (
                    <div
                      key={fidx}
                      className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : fidx)}
                        className="w-full flex items-center justify-between p-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="p-5 pt-0 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Checkout Modal */}
      {purchasingPlan && (
        <AppOverlay>
<div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="tech-subscribe-modal bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Confirm Subscription
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You are subscribing to <strong className="text-gray-900">{service.name}</strong> on the <strong className="text-orange-700">{purchasingPlan.name}</strong> plan.
            </p>

            {String(service.slug || '').toLowerCase() === 'ai-business-suite' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  AI Tool Codes <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={providerInputs.aiTools || ''}
                  onChange={(e) => setProviderField('aiTools', e.target.value)}
                  placeholder="e.g. content-marketing-suite"
                  className={TECH_SUBSCRIBE_FIELD}
                />
              </div>
            )}

            {String(service.slug || '').toLowerCase() === 'cloud-storage' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Storage Plan <span className="text-red-500">*</span>
                </label>
                <select
                  value={providerInputs.storagePlan || ''}
                  onChange={(e) => setProviderField('storagePlan', e.target.value)}
                  className={TECH_SUBSCRIBE_FIELD}
                >
                  <option value="">Select storage plan</option>
                  {['50gb', '100gb', '200gb', '500gb', '1tb', '2tb'].map((option) => (
                    <option key={option} value={option}>{option.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}

            {String(service.slug || '').toLowerCase() === 'document-signer' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={providerInputs.companyName || ''}
                  onChange={(e) => setProviderField('companyName', e.target.value)}
                  placeholder="e.g. Acme Private Limited"
                  className={TECH_SUBSCRIBE_FIELD}
                />
              </div>
            )}

            {['invoice-ai', 'appointment-booking'].includes(String(service.slug || '').toLowerCase()) && (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Subdomain <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={providerInputs.subdomain || ''}
                    onChange={(e) => setProviderField('subdomain', e.target.value)}
                    placeholder="e.g. mybusiness"
                    className={TECH_SUBSCRIBE_FIELD}
                  />
                </div>
                <input
                  type="text"
                  value={providerInputs.businessName || ''}
                  onChange={(e) => setProviderField('businessName', e.target.value)}
                  placeholder="Business name"
                  className={TECH_SUBSCRIBE_FIELD}
                />
              </div>
            )}

            {String(service.slug || '').toLowerCase() === 'business-phone' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Area Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={areaCode}
                  onChange={(e) => {
                    setAreaCode(e.target.value);
                    setInputError(null);
                  }}
                  placeholder="e.g. 415"
                  className={TECH_SUBSCRIBE_FIELD}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Business Phone number will be assigned to this area code.
                </p>
              </div>
            )}

            {String(service.slug || '').toLowerCase() === 'web-hosting' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Primary Domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={primaryDomain}
                  onChange={(e) => {
                    setPrimaryDomain(e.target.value);
                    setInputError(null);
                  }}
                  placeholder="e.g. example.com"
                  className={TECH_SUBSCRIBE_FIELD}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This domain will be used to create your hosting account (e.g. example.com → cpanel username 'example').
                </p>
              </div>
            )}

            {String(service.slug || '').toLowerCase() === 'smm-growth' && (
              <div className="mb-4 space-y-3">
                <input
                  type="text"
                  value={providerInputs.serviceId || ''}
                  onChange={(e) => setProviderField('serviceId', e.target.value)}
                  placeholder="SMM service ID"
                  className={TECH_SUBSCRIBE_FIELD}
                />
                <input
                  type="url"
                  value={providerInputs.link || ''}
                  onChange={(e) => setProviderField('link', e.target.value)}
                  placeholder="Social link"
                  className={TECH_SUBSCRIBE_FIELD}
                />
                <input
                  type="number"
                  min="1"
                  value={providerInputs.quantity || ''}
                  onChange={(e) => setProviderField('quantity', e.target.value)}
                  placeholder="Quantity"
                  className={TECH_SUBSCRIBE_FIELD}
                />
              </div>
            )}

            {String(service.slug || '').toLowerCase() === 'esim' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  eSIM Package Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={providerInputs.packageCode || ''}
                  onChange={(e) => setProviderField('packageCode', e.target.value)}
                  placeholder="e.g. global-5gb"
                  className={TECH_SUBSCRIBE_FIELD}
                />
              </div>
            )}

            {String(service.slug || '').toLowerCase() === 'wordpress-plugin-pack' && (
              <div className="mb-4 space-y-3">
                <input
                  type="text"
                  value={providerInputs.pluginName || ''}
                  onChange={(e) => setProviderField('pluginName', e.target.value)}
                  placeholder="Plugin name"
                  className={TECH_SUBSCRIBE_FIELD}
                />
                <input
                  type="text"
                  value={providerInputs.author || ''}
                  onChange={(e) => setProviderField('author', e.target.value)}
                  placeholder="Author"
                  className={TECH_SUBSCRIBE_FIELD}
                />
                <input
                  type="text"
                  value={providerInputs.description || ''}
                  onChange={(e) => setProviderField('description', e.target.value)}
                  placeholder="Description"
                  className={TECH_SUBSCRIBE_FIELD}
                />
                <input
                  type="url"
                  value={providerInputs.logoUrl || ''}
                  onChange={(e) => setProviderField('logoUrl', e.target.value)}
                  placeholder="Logo URL"
                  className={TECH_SUBSCRIBE_FIELD}
                />
              </div>
            )}

            {inputError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {inputError}
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6 border border-gray-100 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Billing Cycle:</span>
                <span className="font-semibold text-gray-900 capitalize">{billingCycle}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Service Fee:</span>
                <span className="font-semibold text-gray-900">
                  {formatTechPrice(
                    billingCycle === 'annually' ? purchasingPlan.price_annually : purchasingPlan.price_monthly
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-200 font-bold text-gray-900">
                <span>Total Due Today:</span>
                <span className="text-orange-700 text-base">
                  {formatTechPrice(
                    billingCycle === 'annually' ? purchasingPlan.price_annually : purchasingPlan.price_monthly
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPurchasingPlan(null)}
                disabled={submitting}
                className="w-1/2 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                disabled={submitting}
                className="w-1/2 rounded-xl bg-orange-700 py-3 text-sm font-bold text-white shadow-md hover:bg-orange-800 flex items-center justify-center gap-2"
              >
                {submitting ? t('techDetailProvisioning', { defaultValue: 'Provisioning...' }) : t('techDetailConfirmPay', { defaultValue: 'Confirm & Pay' })}
              </button>
            </div>
          </div>
        </div>
</AppOverlay>
      )}

      {/* Success Modal */}
      {purchasedSuccess && (
        <AppOverlay>
<div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl text-center relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900">Subscription Active!</h3>
            <p className="text-sm text-gray-600 mt-2">
              Your <strong className="text-gray-900">{service.name}</strong> subscription has been provisioned successfully.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 my-6 text-left space-y-2 border border-gray-100 text-xs text-gray-600">
              <div><strong>Status:</strong> <span className="text-emerald-600 font-bold">ACTIVE</span></div>
            </div>

            <button
              onClick={() => {
                setPurchasedSuccess(null);
                navigate('/technology/dashboard');
              }}
              className="w-full rounded-xl bg-orange-700 py-3 text-sm font-bold text-white shadow-md hover:bg-orange-800"
            >
              Go to My Technologies Dashboard
            </button>
          </div>
        </div>
</AppOverlay>
      )}

    </AppLayout>
  );
}
