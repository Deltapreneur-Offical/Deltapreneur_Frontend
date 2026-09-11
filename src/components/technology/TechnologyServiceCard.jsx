import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import TruncatedTextTooltip from '../common/TruncatedTextTooltip';
import PriceSectionIcon from '../common/PriceSectionIcon';
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

/**
 * Translate a technology-service string using a deterministic key derived from
 * the original English text. Falls back to the original text when no translation
 * key exists — proper names like "AI Business Suite" stay unchanged.
 */
export function techT(t, prefix, text) {
  if (!text) return text;
  const key = `${prefix}${text.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
  return t(key, { defaultValue: text });
}

export default function TechnologyServiceCard({ service, compact = false, homeLayout = false }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      className={`tech-service-card group relative flex flex-col rounded-2xl border border-blue-200 bg-white shadow-sm transition-[transform,border-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-800/15 cursor-pointer overflow-hidden ${
        homeLayout ? 'tech-service-card--home justify-start p-5' : 'justify-between p-6'
      }`}
    >
      {/* Top Accent Glow */}
      <div className="tech-service-card__accent-glow absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/10 to-blue-600/10 blur-xl transition-all duration-75 group-hover:scale-150 group-hover:from-orange-600/25 group-hover:to-orange-800/25" />

      <div>
        {/* Header Row */}
        <div className={`flex items-start justify-between gap-2 min-w-0 ${homeLayout ? 'mb-3' : 'mb-4'}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="tech-service-card__icon flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 text-blue-600 transition-all duration-75 group-hover:scale-110 group-hover:from-orange-700 group-hover:to-orange-800 group-hover:text-white shadow-inner shrink-0">
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              {homeLayout ? (
                <>
                  {/* Full service name — no truncation, no tooltip */}
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-800 transition-colors duration-75 break-words leading-snug">
                    {service.name}
                  </h3>
                  {/* Badges stacked vertically below the name */}
                  <div className="mt-2.5 flex flex-col items-start gap-1.5">
                    <span className="tech-service-card__badge inline-block rounded-full bg-blue-50 px-2 py-[1px] text-[10px] font-semibold text-blue-600 uppercase tracking-wider whitespace-nowrap max-w-full transition-colors duration-75 group-hover:bg-orange-700 group-hover:text-white">
                      {techT(t, 'techCat_', service.category)}
                    </span>
                    {service.badge && (
                      <span className="tech-service-card__badge inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-2 py-[1px] text-[10px] font-bold text-amber-700 border border-amber-200/50 whitespace-nowrap leading-tight max-w-full transition-colors duration-75 group-hover:from-orange-700 group-hover:to-orange-800 group-hover:text-white group-hover:border-orange-700">
                        {techT(t, 'techBadge_', service.badge)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="tech-service-card__badge inline-block rounded-full bg-blue-50 px-2 py-[1px] text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1 truncate max-w-full transition-colors duration-75 group-hover:bg-orange-700 group-hover:text-white">
                    {techT(t, 'techCat_', service.category)}
                  </span>
                  <TruncatedTextTooltip text={service.name} className="block min-w-0 max-w-full">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-800 transition-colors duration-75 truncate">
                      {service.name}
                    </h3>
                  </TruncatedTextTooltip>
                </>
              )}
            </div>
          </div>

          {!homeLayout && service.badge && (
            <span className="tech-service-card__badge shrink-0 max-w-[45%] inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-2 py-[1px] text-[10px] font-bold text-amber-700 border border-amber-200/50 whitespace-nowrap overflow-hidden text-ellipsis leading-tight transition-colors duration-75 group-hover:from-orange-700 group-hover:to-orange-800 group-hover:text-white group-hover:border-orange-700">
              {techT(t, 'techBadge_', service.badge)}
            </span>
          )}
        </div>

        {/* Short Description */}
        <p className={`text-sm text-gray-600 line-clamp-2 leading-relaxed ${homeLayout ? 'mb-0' : 'mb-4'}`}>
          {techT(t, `techDesc_${service.slug}_`, service.short_description)}
        </p>

        {/* Features Checklist */}
        {!compact && service.features && service.features.length > 0 && (
          <ul className="space-y-2 mb-6 border-t border-gray-100 pt-4">
            {service.features.slice(0, 3).map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="line-clamp-1">{techT(t, `techFeat_${service.slug}_${idx}_`, feat)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer / Price & CTA */}
      <div className={`tech-service-card__footer flex items-center justify-between gap-1.5 sm:gap-2 border-t border-gray-100 min-w-0 ${homeLayout ? 'pt-3 mt-3' : 'pt-3.5 mt-2'}`}>
        {homeLayout ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            aria-label={t('commonExploreService', { defaultValue: 'Explore Service' })}
            className="tech-service-card__price-pill"
          >
            <span className="tech-service-card__price-text">
              <span className="tech-service-card__price-label">{t('commonStartingAt', { defaultValue: 'Starting at' })}</span>
              <span className="tech-service-card__price-row">
                <span className="tech-service-card__price-amount">
                  {formatTechPrice(service.starting_price || 15)}
                </span>
                <span className="tech-service-card__price-suffix">/{t('commonMo', { defaultValue: 'mo' })}</span>
              </span>
            </span>
            <span className="tech-service-card__price-arrow" aria-hidden>
              <PriceSectionIcon />
            </span>
          </button>
        ) : (
          <>
            <div className="min-w-max shrink-0">
              <span className="block text-[11px] text-gray-400 font-medium leading-none mb-1">{t('commonStartingAt', { defaultValue: 'Starting at' })}</span>
              <div className="inline-flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-sm sm:text-base md:text-lg xl:text-xl font-extrabold text-gray-900 leading-none whitespace-nowrap">
                  {formatTechPrice(service.starting_price || 15)}
                </span>
                <span className="text-xs text-gray-500 font-semibold leading-none shrink-0 whitespace-nowrap">/{t('commonMo', { defaultValue: 'mo' })}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="inline-flex shrink items-center gap-1 rounded-xl bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all duration-75 group-hover:bg-orange-800 group-hover:shadow-md group-hover:shadow-orange-800/30 whitespace-nowrap min-w-0 sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-xs"
            >
              <span className="truncate">{t('commonExploreService', { defaultValue: 'Explore Service' })}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-1" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
