import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const IconComponent = (service.icon && ICON_MAP[service.icon]) || Box;

  const handleCardClick = () => {
    navigate(`/technologies/${service.slug}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden"
    >
      {/* Top Accent Glow */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-xl transition-all duration-500 group-hover:scale-150 group-hover:from-indigo-500/20 group-hover:to-purple-500/20" />

      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 transition-all duration-300 group-hover:scale-110 group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:text-white shadow-inner">
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                {service.category}
              </span>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {service.name}
              </h3>
            </div>
          </div>

          {service.badge && (
            <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/50">
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
      <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
        <div>
          <span className="text-xs text-gray-400 font-medium">Starting at</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-gray-900">${service.starting_price || 15}</span>
            <span className="text-xs text-gray-500 font-medium">/mo</span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-300 group-hover:bg-indigo-600 group-hover:shadow-md group-hover:shadow-indigo-600/30"
        >
          Explore Service
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
