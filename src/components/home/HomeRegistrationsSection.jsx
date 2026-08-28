import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Share2, Search, Check } from 'lucide-react';
import {
  Briefcase, Building2, Car, Clapperboard, Copyright, Cpu,
  Factory, FlaskConical, Globe, GraduationCap, HardHat, HeartPulse,
  Hotel, Landmark, Leaf, Monitor, Plane, Radio, Receipt, Rocket,
  Shield, ShoppingBag, Truck, Users, UtensilsCrossed, Wheat, Zap,
} from 'lucide-react';
import { getStaticHubRegistrarCategories } from '../../utils/operationsCategories';
import { registrationsPathForCategory, REGISTRATIONS_PAGE_PATH } from '../../utils/operationsSections';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import '../../styles/registrations-catalog.css';

const CATEGORY_ICONS = {
  business_entity: Building2, tax_identity: Receipt, local_licences: Landmark,
  msme_udyam: Factory, startup_dpiit: Rocket, food_fssai: UtensilsCrossed,
  import_export: Globe, manufacturing: Factory, technology_saas: Cpu,
  ecommerce: ShoppingBag, fintech: Landmark, aviation: Plane,
  construction_real_estate: HardHat, healthcare: HeartPulse,
  education: GraduationCap, professional_services: Briefcase, telecom: Radio,
  pharma_chemical: FlaskConical, automotive: Car, agriculture: Wheat,
  logistics_transport: Truck, tourism_hospitality: Hotel,
  entertainment_media: Clapperboard, energy_power: Zap,
  defence_aerospace: Shield, intellectual_property: Copyright,
  employer_labour: Users, environmental: Leaf, digital_services: Monitor,
};

const ALL_CATEGORIES = getStaticHubRegistrarCategories();
const EMPTY_MESSAGE = 'No category found. Check back soon, we are working on it.';

export default function HomeRegistrationsSection() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [copiedSlug, setCopiedSlug] = useState(null);
  const shouldAutoScroll = useShouldAutoScroll(ALL_CATEGORIES.length);

  const filteredCategories = useMemo(() => {
    const query = categoryFilter.trim().toLowerCase();
    if (!query) return ALL_CATEGORIES;
    return ALL_CATEGORIES.filter((cat) => (
      cat.label.toLowerCase().includes(query)
      || cat.slug.toLowerCase().includes(query)
      || (cat.description || '').toLowerCase().includes(query)
      || (cat.highlights || []).some((p) => p.toLowerCase().includes(query))
    ));
  }, [categoryFilter]);

  const handleShare = useCallback((e, slug) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.origin + registrationsPathForCategory(slug);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 1500);
      }).catch(() => {
        window.prompt('Copy this link:', url);
      });
    } else {
      window.prompt('Copy this link:', url);
    }
  }, []);

  const renderCard = (cat) => {
    const Icon = CATEGORY_ICONS[cat.slug] || Briefcase;
    const highlights = (cat.highlights || []).slice(0, 3);

    return (
      <Link
        to={registrationsPathForCategory(cat.slug)}
        className="reg-mini-card"
        aria-label={`${cat.label} registrations`}
      >
        <button type="button" className="reg-mini-card__share" onClick={(e) => handleShare(e, cat.slug)} aria-label="Share">
          {copiedSlug === cat.slug ? <Check size={15} strokeWidth={2.5} /> : <Share2 size={15} strokeWidth={2} />}
        </button>
        <div className="reg-mini-card__top">
          <h3 className="reg-mini-card__title">{cat.label}</h3>
          {cat.description && (
            <p className="reg-mini-card__desc">{cat.description}</p>
          )}
        </div>
        {highlights.length > 0 && (
          <ul className="reg-mini-card__list">
            {highlights.map((point) => (
              <li key={point}>
                <CheckCircle2 size={14} strokeWidth={2} aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="reg-mini-card__footer">
          <span className="reg-mini-card__cta">
            Explore
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </span>
          <div className="reg-mini-card__icon">
            <Icon size={36} strokeWidth={1.5} />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="bg-white pt-3 pb-4 md:pt-4 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <div className="reg-section-header">
          <h2 className="reg-section-header__title">Registrations</h2>
          <div className="reg-section-header__actions">
            <div className="reg-section-header__search">
              <Search size={16} className="reg-section-header__search-icon" />
              <input
                type="text"
                placeholder="Search with Category"
                className="reg-section-header__search-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Search with Category"
              />
              {categoryFilter && (
                <button type="button" className="reg-section-header__search-clear" onClick={() => setCategoryFilter('')} aria-label="Clear search">×</button>
              )}
            </div>
            <Link to={REGISTRATIONS_PAGE_PATH} className="reg-section-header__view-all">
              <span>View All</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
        {filteredCategories.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{EMPTY_MESSAGE}</p>
        ) : shouldAutoScroll ? (
          <HomeAutoScrollRow durationSec={160} ariaLabel="Registrations">
            {filteredCategories.map((cat) => (
              <HomeAutoScrollRowItem key={cat.slug}>
                {renderCard(cat)}
              </HomeAutoScrollRowItem>
            ))}
          </HomeAutoScrollRow>
        ) : (
          <HomePreviewRow>
            {filteredCategories.map((cat) => (
              <HomePreviewRowItem key={cat.slug}>
                {renderCard(cat)}
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
