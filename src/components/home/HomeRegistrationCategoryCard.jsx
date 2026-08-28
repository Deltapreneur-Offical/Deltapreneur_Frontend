import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Building2, Car, Clapperboard, Copyright, Cpu,
  Factory, FlaskConical, Globe, GraduationCap, HardHat, HeartPulse,
  Hotel, Landmark, Leaf, Monitor, Plane, Radio, Receipt, Rocket,
  Shield, ShoppingBag, Truck, Users, UtensilsCrossed, Wheat, Zap,
  ArrowUpRight, Share2, Check,
} from 'lucide-react';
import { registrationsPathForCategory } from '../../utils/operationsSections';
import '../../styles/registrations-catalog.css';

const CATEGORY_TONES = [
  { bg: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)', border: '#bfdbfe', fg: '#1d4ed8' },
  { bg: 'linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 100%)', border: '#99f6e4', fg: '#0f766e' },
  { bg: 'linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)', border: '#c7d2fe', fg: '#4338ca' },
  { bg: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)', border: '#fed7aa', fg: '#c2410c' },
  { bg: 'linear-gradient(180deg, #fdf4ff 0%, #fae8ff 100%)', border: '#f5d0fe', fg: '#a21caf' },
];

function toneForSlug(slug) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash + slug.charCodeAt(i) * (i + 1)) % CATEGORY_TONES.length;
  }
  return CATEGORY_TONES[hash];
}

export const CATEGORY_ICONS = {
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

export default function HomeRegistrationCategoryCard({ category, variant = 'marquee' }) {
  const Icon = CATEGORY_ICONS[category.slug] || Briefcase;
  const tone = toneForSlug(category.slug || '');
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.origin + registrationsPathForCategory(category.slug);
    const title = category.label || 'HubRegistrar';
    const text = 'Check out ' + title + ' registrations on HubRegistrar!\n\n' + url;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
      return;
    }

    const doCopy = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(url);
      }
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve();
    };

    doCopy()
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        window.prompt('Copy this link:', url);
      });
  }, [category.slug, category.label]);

  return (
    <div className="reg-service-card-wrapper">
      <button type="button" className="reg-service-card__share" onClick={handleShare} aria-label="Share">
        {copied ? <Check size={14} strokeWidth={2.5} /> : <Share2 size={14} strokeWidth={2} />}
      </button>
      <Link
        to={registrationsPathForCategory(category.slug)}
        className={'reg-category-card reg-category-card--' + variant}
        style={{
          '--reg-card-bg': tone.bg,
          '--reg-card-border': tone.border,
          '--reg-card-fg': tone.fg,
        }}
        aria-label={category.label + ' registrations'}
      >
        <div className="reg-category-card__icon" aria-hidden>
          <Icon size={variant === 'catalog' ? 26 : 22} strokeWidth={1.75} />
        </div>
        <div className="reg-category-card__body">
          {variant === 'marquee' && (
            <p className="reg-category-card__kicker">Hub Registrar</p>
          )}
          <h3 className="reg-category-card__title">{category.label}</h3>
          {category.description && variant === 'catalog' && (
            <p className="reg-category-card__desc">{category.description}</p>
          )}
          {variant === 'marquee' && (category.highlights || []).length > 0 && (
            <ul className="reg-category-card__points">
              {category.highlights.slice(0, 3).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
        </div>
        <span className="reg-category-card__cta">
          Explore
          <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden />
        </span>
      </Link>
    </div>
  );
}
