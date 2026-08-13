import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../../context/CurrencyContext';
import TruncatedTextTooltip from '../common/TruncatedTextTooltip';
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
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

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

export default function TechnologyServiceCard({ service, compact = false }) {
  const navigate = useNavigate();
  const { formatPrice, convertToInr } = useCurrency();
  const IconComponent = (service.icon && ICON_MAP[service.icon]) || Box;

  /** Tech catalogue prices are stored in USD; convert via INR for the selected header currency. */
  const formatTechPrice = (usdAmount) =>
    formatPrice(convertToInr(Number(usdAmount) || 0, 'USD'));

  const handleCardClick = () => {
    navigate(`/technologies/${service.slug}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-150 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer overflow-hidden"
    >
      {/* Top Accent Glow */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/10 to-blue-600/10 blur-xl transition-all duration-150 group-hover:scale-150 group-hover:from-sky-500/20 group-hover:to-blue-600/20" />

      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 text-blue-600 transition-all duration-150 group-hover:scale-110 group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white shadow-inner shrink-0">
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1 truncate max-w-full">
                {service.category}
              </span>
              <TruncatedTextTooltip text={service.name} className="block min-w-0 max-w-full">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {service.name}
                </h3>
              </TruncatedTextTooltip>
            </div>
          </div>

          {service.badge && (
            <span className="shrink-0 max-w-[45%] inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200/50 whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
              {service.badge}
            </span>
          )}
        </div>

        {/* Short Description */}
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">
          {service.short_description}
        </p>

        {/* Features Checklist */}
        {!compact && service.features && service.features.length > 0 && (
          <ul className="space-y-2 mb-6 border-t border-gray-100 pt-4">
            {service.features.slice(0, 3).map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="line-clamp-1">{feat}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer / Price & CTA */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 border-t border-gray-100 pt-3.5 mt-2 min-w-0">
        <div className="min-w-max shrink-0">
          <span className="block text-[11px] text-gray-400 font-medium leading-none mb-1">Starting at</span>
          <div className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-sm sm:text-base md:text-lg xl:text-xl font-extrabold text-gray-900 leading-none whitespace-nowrap">
              {formatTechPrice(service.starting_price || 15)}
            </span>
            <span className="text-xs text-gray-500 font-semibold leading-none shrink-0 whitespace-nowrap">/mo</span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="shrink inline-flex items-center gap-1 sm:gap-1.5 rounded-xl bg-gray-900 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-sm transition-all duration-150 group-hover:bg-blue-600 group-hover:shadow-md group-hover:shadow-blue-600/30 whitespace-nowrap min-w-0"
        >
          <span className="truncate">Explore Service</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
