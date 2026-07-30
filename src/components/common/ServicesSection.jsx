import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Globe, RefreshCw, ShieldCheck, ShieldAlert, ArrowRight,
  CheckCircle2, Loader2, RotateCcw, Shield, Filter,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import HomeSectionHeader from '../home/HomeSectionHeader';
import HomePreviewCardShell from '../home/HomePreviewCardShell';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from '../home/HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from '../home/HomePreviewRow';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import { domainStorefrontAPI } from '../../api/services';
import '../../styles/domain-essentials.css';

/** Strip period suffix from API labels like "From ₹708 / yr" so the unit shows once. */
function splitCardPrice(price, unit) {
  const raw = String(price ?? '').trim();
  const cleaned = raw.replace(/\s*\/\s*(yr|year|mo|month|setup)\s*$/i, '').trim() || raw;

  if (/^free(\s+setup)?$/i.test(cleaned)) {
    return { amount: 'Free', unitLabel: 'setup' };
  }

  const unitWords = { yr: 'year', month: 'month', setup: 'setup' };
  return {
    amount: cleaned,
    unitLabel: `per ${unitWords[unit] || unit}`,
  };
}

/** Existing Domain Essentials card UI — unchanged; only the section layout wraps it. */
function DomainEssentialCard({
  card,
  hasDomains,
  pricesLoading,
  fmt,
  onCta,
}) {
  const Icon = card.icon;
  const { amount, unitLabel } = splitCardPrice(card.price, card.unit);

  return (
    <div
      className="domain-essential-card relative flex h-full flex-col rounded-[24px] overflow-hidden cursor-default border border-black bg-white shadow-sm"
    >
      <div className="p-6 flex flex-col flex-1 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-amber-50 border border-amber-100"
          >
            <Icon className="w-6 h-6 text-amber-700" strokeWidth={2} />
          </div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
          >
            {card.tag}
          </span>
        </div>

        <div>
          <h3 className="text-[15px] font-bold text-gray-900 leading-snug">
            {card.title}
          </h3>
          {!hasDomains && card.id !== 'transfer' && (
            <span className="inline-block mt-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              Needs an Active Domain
            </span>
          )}
        </div>

        {card.id === 'transfer' && card.tldPrices && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 -mt-1">
            {Object.entries(card.tldPrices).map(([tld, price]) => (
              <div key={tld} className="flex justify-between items-center text-[10.5px]">
                <span className="font-bold text-gray-700 font-mono">{tld}</span>
                <span className="text-gray-500 font-semibold">
                  {fmt(price)}<span className="text-gray-400 text-[9px]">/yr</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {card.id === 'renew' && card.tldRenewPrices && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 -mt-1">
            {Object.entries(card.tldRenewPrices).map(([tld, price]) => (
              <div key={tld} className="flex justify-between items-center text-[10.5px]">
                <span className="font-bold text-gray-700 font-mono">{tld}</span>
                <span className="text-gray-500 font-semibold">
                  {fmt(price)}<span className="text-gray-400 text-[9px]">/yr</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {card.id !== 'transfer' && card.id !== 'renew' && (
          <ul className="flex-1 space-y-2">
            {card.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[12px] text-gray-650 font-medium">
                <CheckCircle2
                  className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {(card.id === 'transfer' || card.id === 'renew') && (
          <ul className="flex-1 space-y-1.5">
            {card.bullets.slice(0, 2).map((b) => (
              <li key={b} className="flex items-start gap-2 text-[12px] text-gray-655 font-medium">
                <CheckCircle2
                  className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-gray-100" />

        <div className="domain-essential-card__footer flex items-center justify-between gap-2">
          <div className="domain-essential-card__price min-w-0 flex-1 overflow-hidden">
            {pricesLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
            ) : (
              <>
                <p className="domain-essential-card__price-amount text-[13px] font-bold text-gray-900 leading-tight">
                  {amount}
                </p>
                <p className="domain-essential-card__price-unit text-[9px] font-semibold text-gray-400 mt-0.5 tracking-wide uppercase">
                  {unitLabel}
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onCta(card.id)}
            className="domain-essential-card__cta inline-flex items-center justify-center gap-1 h-8 px-3 rounded-xl text-white text-[11px] font-semibold bg-amber-700 hover:bg-amber-800 transition-all select-none active:scale-95 shadow-sm shrink-0"
          >
            {card.cta}
            <ArrowRight
              className="domain-essential-card__cta-arrow"
              size={12}
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesSection({ isDashboard = false }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [latestOrderId, setLatestOrderId] = useState('');
  const [hasDomains, setHasDomains] = useState(false);
  const [prices, setPrices] = useState(null);
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    domainStorefrontAPI.listOrders()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.data ?? [];
        const active = list.filter((o) =>
          o.status === 'ACTIVE' ||
          o.lifecycleStatus === 'registration_confirmed' ||
          o.lifecycleStatus === 'registration_pending',
        );
        if (active.length > 0) {
          setLatestOrderId(active[0].id);
          setHasDomains(true);
        }
      })
      .catch(() => {});

    domainStorefrontAPI.getPrices()
      .then(({ data }) => setPrices(data?.data ?? data))
      .catch(() => setPrices(null))
      .finally(() => setPricesLoading(false));
  }, []);

  const getRoute = (id) => {
    switch (id) {
      case 'email':
      case 'ssl':
      case 'dnssec':
      case 'restore':
      case 'easydmarc':
      case 'spamexperts':
        return latestOrderId ? `/storefront/orders/${latestOrderId}#products` : '/storefront';
      case 'renew':
        return latestOrderId ? `/storefront/orders/${latestOrderId}#overview` : '/storefront';
      case 'transfer':
        return '/storefront?tab=transfer';
      default:
        return '/domains/dashboard';
    }
  };

  const fmt = (n) => (n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—');

  const cards = [
    {
      id: 'email',
      icon: Mail,
      colorFrom: '#7c3aed',
      colorTo: '#a855f7',
      bgLight: 'rgba(124,58,237,0.06)',
      border: 'rgba(124,58,237,0.18)',
      textAccent: '#7c3aed',
      badge: '#ede9fe',
      title: 'Professional Email',
      tag: 'Mailbox',
      price: prices ? `${fmt(prices.email?.unitInr)}` : '₹100',
      unit: 'month',
      bullets: [
        'yourname@yourbrand.com',
        'Spam & malware filters',
        'Webmail + mobile access',
        '5 GB storage per mailbox',
      ],
      cta: 'Create Mailbox',
    },
    {
      id: 'transfer',
      icon: Globe,
      colorFrom: '#059669',
      colorTo: '#10b981',
      bgLight: 'rgba(5,150,105,0.06)',
      border: 'rgba(5,150,105,0.18)',
      textAccent: '#059669',
      badge: '#d1fae5',
      title: 'Domain Transfer',
      tag: 'All TLDs',
      price: prices ? prices.transfer?.label : 'From ₹499',
      unit: 'yr',
      tldPrices: prices?.transfer?.byTld,
      bullets: [
        '.com, .in, .net, .org & more',
        'Free EPP-code transfer',
        'Zero downtime migration',
        'Auto-sync DNS settings',
      ],
      cta: 'Initiate Transfer',
    },
    {
      id: 'renew',
      icon: RefreshCw,
      colorFrom: '#2563eb',
      colorTo: '#3b82f6',
      bgLight: 'rgba(37,99,235,0.06)',
      border: 'rgba(37,99,235,0.18)',
      textAccent: '#2563eb',
      badge: '#dbeafe',
      title: 'Renew Domain',
      tag: 'Multi-year',
      price: prices ? prices.renewal?.label : 'From ₹100',
      unit: 'yr',
      tldRenewPrices: prices?.renewal?.byTld,
      bullets: [
        'Lock domain for up to 10 yrs',
        'Expiry alerts via email',
        'Auto-renew option available',
        'Instant registry update',
      ],
      cta: 'Renew Domain',
    },
    {
      id: 'ssl',
      icon: ShieldCheck,
      colorFrom: '#d97706',
      colorTo: '#f59e0b',
      bgLight: 'rgba(217,119,6,0.06)',
      // border: 'rgba(217,119,6,0.18)',
      textAccent: '#d97706',
      badge: '#fef3c7',
      title: 'SSL Certificate',
      tag: 'HTTPS',
      price: prices ? (prices.ssl?.label || '—') : '—',
      unit: 'yr',
      bullets: [
        'Standard & Wildcard SSL',
        'Browser padlock enabled',
        'Auto-renew support',
        '256-bit encryption',
      ],
      cta: 'Configure SSL',
    },
    {
      id: 'dnssec',
      icon: ShieldAlert,
      colorFrom: '#dc2626',
      colorTo: '#f87171',
      bgLight: 'rgba(220,38,38,0.06)',
      border: 'rgba(220,38,38,0.18)',
      textAccent: '#dc2626',
      badge: '#fee2e2',
      title: 'DNSSEC',
      tag: 'Free',
      price: prices ? (prices.dnssec?.label || 'Free Setup') : 'Free Setup',
      unit: 'setup',
      bullets: [
        'Cryptographic DNS signing',
        'Prevent cache poisoning',
        'Anti-spoofing protection',
        'One-click activation',
      ],
      cta: 'Toggle DNSSEC',
    },
    {
      id: 'restore',
      icon: RotateCcw,
      colorFrom: '#b45309',
      colorTo: '#f59e0b',
      bgLight: 'rgba(180,83,9,0.06)',
      border: 'rgba(180,83,9,0.18)',
      textAccent: '#b45309',
      badge: '#ffedd5',
      title: 'Domain Restore',
      tag: 'Redemption',
      price: prices ? (prices.restore?.label || 'Live quote') : 'Live quote',
      unit: 'yr',
      bullets: [
        'Recover domains in redemption',
        'Live OpenProvider restore price',
        'Secure ownership before delete',
        'Pay once & restore via registrar',
      ],
      cta: 'Restore Domain',
    },
    {
      id: 'easydmarc',
      icon: Shield,
      colorFrom: '#0d9488',
      colorTo: '#14b8a6',
      bgLight: 'rgba(13,148,136,0.06)',
      border: 'rgba(13,148,136,0.18)',
      textAccent: '#0d9488',
      badge: '#ccfbf1',
      title: 'EasyDMARC',
      tag: 'DMARC',
      price: prices ? (prices.easydmarc?.label || '₹499') : '₹499',
      unit: 'yr',
      bullets: [
        'Stop brand email spoofing',
        'DMARC DNS record guidance',
        'OpenProvider EasyDMARC order',
        'SSO access to DMARC panel',
      ],
      cta: 'Activate EasyDMARC',
    },
    {
      id: 'spamexperts',
      icon: Filter,
      colorFrom: '#e11d48',
      colorTo: '#fb7185',
      bgLight: 'rgba(225,29,72,0.06)',
      border: 'rgba(225,29,72,0.18)',
      textAccent: '#e11d48',
      badge: '#ffe4e6',
      title: 'SpamExperts',
      tag: 'Filter',
      price: prices ? (prices.spamexperts?.label || '₹299') : '₹299',
      unit: 'yr',
      bullets: [
        'Incoming spam & malware filter',
        'Protect your domain mailbox',
        'Control-panel login after setup',
        'Managed via OpenProvider',
      ],
      cta: 'Activate Filter',
    },
  ];

  const titleText = isDashboard ? 'Quick Actions' : 'Domain Essentials';
  const shouldAutoScroll = useShouldAutoScroll(cards.length);
  const handleCta = (id) => navigate(getRoute(id));

  const renderCard = (card) => (
    <DomainEssentialCard
      card={card}
      hasDomains={hasDomains}
      pricesLoading={pricesLoading}
      fmt={fmt}
      onCta={handleCta}
    />
  );

  const renderHomeCard = (card) => (
    <HomePreviewCardShell accent="domain" borderless>
      {renderCard(card)}
    </HomePreviewCardShell>
  );

  // Homepage: same section chrome + marquee as Domains / Technology / VA
  if (!isDashboard) {
    return (
      <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
        <div className="w-full min-w-0">
          <HomeSectionHeader title={titleText} to="/storefront" />
          {shouldAutoScroll ? (
            <HomeAutoScrollRow durationSec={50} ariaLabel={titleText}>
              {cards.map((card) => (
                <HomeAutoScrollRowItem key={card.id}>
                  {renderHomeCard(card)}
                </HomeAutoScrollRowItem>
              ))}
            </HomeAutoScrollRow>
          ) : (
            <HomePreviewRow>
              {cards.map((card) => (
                <HomePreviewRowItem key={card.id}>
                  {renderHomeCard(card)}
                </HomePreviewRowItem>
              ))}
            </HomePreviewRow>
          )}
          {prices?.gstRate > 0 && (
            <p className="text-center text-[10px] text-gray-400 mt-3 px-4">
              * All prices are exclusive of {prices.gstRate >= 1 ? prices.gstRate : (prices.gstRate * 100).toFixed(0)}% GST
            </p>
          )}
        </div>
      </section>
    );
  }

  // Dashboard: keep the existing grid layout
  const cardVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  };
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  return (
    <section className="dashboard-section py-4">
      <div>
        <div className="flex items-center justify-between mt-2 mb-6">
          <h2 className="dashboard-section__title text-gray-900 font-bold text-xl">{titleText}</h2>
          <button
            type="button"
            onClick={() => navigate('/domains/dashboard')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
          >
            <span>Manage All Domains</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {prices?.source && (
          <div className="flex items-center gap-1.5 mb-4 mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
              <CheckCircle2 size={9} />
              Live prices
            </span>
          </div>
        )}

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2"
          initial={reduceMotion ? false : 'hidden'}
          whileInView={reduceMotion ? false : 'visible'}
          viewport={{ once: true, amount: 0.15 }}
          variants={reduceMotion ? {} : containerVariants}
        >
          {cards.map((card) => (
            <motion.div
              key={card.id}
              variants={reduceMotion ? {} : cardVariants}
              whileHover={reduceMotion ? {} : { y: -5, transition: { duration: 0.18 } }}
            >
              {renderCard(card)}
            </motion.div>
          ))}
        </motion.div>

        {prices?.gstRate > 0 && (
          <p className="text-center text-[10px] text-gray-400 mt-4">
            * All prices are exclusive of {prices.gstRate >= 1 ? prices.gstRate : (prices.gstRate * 100).toFixed(0)}% GST
          </p>
        )}
      </div>
    </section>
  );
}
