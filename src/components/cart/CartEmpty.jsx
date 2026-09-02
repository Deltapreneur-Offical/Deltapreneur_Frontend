import { ShoppingCart, ArrowRight, Handshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import domainsIcon from '../../assets/CoBranding.png';
import technologyIcon from '../../assets/CoCreation.png';

const LINKS = [
  { to: '/domains', labelKey: 'domains', label: 'Domains', iconSrc: domainsIcon, descKey: 'cartEmptyDomainsDesc', desc: 'Premium & pre-owned names' },
  { to: '/technology', labelKey: 'technology', label: 'Technology', iconSrc: technologyIcon, descKey: 'cartEmptyTechnologyDesc', desc: 'Software & hardware listings' },
  { to: '/ventures', labelKey: 'ventures', label: 'Ventures', icon: Handshake, descKey: 'cartEmptyVenturesDesc', desc: 'Acquisition opportunities' },
];

export default function CartEmpty() {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative flex flex-col items-center justify-center py-16 px-4 text-center overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-indigo-50/80 via-violet-50/40 to-transparent blur-3xl" />
      </div>

      <div className="relative w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-6">
        <ShoppingCart size={34} className="text-gray-300" strokeWidth={1.5} />
      </div>

      <h2 className="relative font-display text-2xl font-semibold text-gray-900 mb-2">
        {t('cartEmptyTitle', { defaultValue: 'Your cart is empty' })}
      </h2>
      <p className="relative text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
        {t('cartEmptyDesc', { defaultValue: "Discover domains, technologies, and ventures on HubRegistrar - add items to your cart and checkout when you're ready." })}
      </p>

      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {LINKS.map(({ to, labelKey, label, icon: Icon, iconSrc, descKey, desc }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col items-start text-left p-4 rounded-[14px] border border-gray-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-50 group-hover:bg-indigo-50 flex items-center justify-center mb-3 transition-colors">
              {iconSrc ? (
                <img
                  src={iconSrc}
                  alt=""
                  className="w-[18px] h-[18px] object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                  draggable={false}
                />
              ) : (
                <Icon size={18} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
              )}
            </div>
            <span className="font-semibold text-sm text-gray-900 flex items-center gap-1">
              {t(labelKey, { defaultValue: label })}
              <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-600" />
            </span>
            <span className="text-xs text-gray-500 mt-0.5">{t(descKey, { defaultValue: desc })}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
