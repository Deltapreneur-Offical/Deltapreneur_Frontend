import {
  Headset, Users, Calculator, Share2, MessageCircle, TrendingUp, Megaphone,
  Code, Server, Layers, ClipboardList, Search, Palette, Film, Database, Briefcase,
  ShieldCheck, Globe, FileCheck, Receipt, Rocket,
  Building2, Landmark, Factory, UtensilsCrossed, Cpu, ShoppingBag, Plane,
  HardHat, HeartPulse, GraduationCap, Radio, FlaskConical, Car, Wheat,
  Truck, Hotel, Clapperboard, Zap, Shield, Copyright, Leaf, Monitor,
} from 'lucide-react';
import { CATEGORY_ICONS } from '../components/home/HomeRegistrationCategoryCard';
import { HUB_REGISTRAR_SUBCATEGORIES } from './hubRegistrarSubcategories';

export const OPERATIONS_ICON_MAP = {
  Headset,
  Users,
  Calculator,
  Share2,
  MessageCircle,
  TrendingUp,
  Megaphone,
  Code,
  Server,
  Layers,
  ClipboardList,
  Search,
  Palette,
  Film,
  Database,
  Briefcase,
  ShieldCheck,
  Globe,
  FileCheck,
  Receipt,
  Rocket,
};

export const OPERATIONS_CATEGORY_DEFAULT_ICONS = {
  people: 'Users',
  finance: 'Calculator',
  marketing: 'Megaphone',
  technology: 'Code',
  sales: 'TrendingUp',
  support: 'MessageCircle',
  creative: 'Palette',
  growth: 'Briefcase',
  operations: 'ClipboardList',
  compliance: 'ShieldCheck',
};

/**
 * Build a lookup from a compliance service name to its category icon.
 * Each subcategory item belongs to a parent category (e.g. "GST Registration"
 * is in "tax_identity"). The parent category has an icon in CATEGORY_ICONS.
 */
function buildComplianceIconLookup() {
  const lookup = new Map();
  for (const [categorySlug, items] of Object.entries(HUB_REGISTRAR_SUBCATEGORIES)) {
    const Icon = CATEGORY_ICONS[categorySlug];
    if (!Icon) continue;
    for (const item of items) {
      // Map the subcategory label (lowercase) → Icon
      lookup.set(item.label.toLowerCase(), Icon);
      // Also map aliases
      for (const alias of item.aliases || []) {
        lookup.set(alias.toLowerCase(), Icon);
      }
    }
  }
  return lookup;
}

let _complianceIconLookup = null;
function getComplianceIconLookup() {
  if (!_complianceIconLookup) _complianceIconLookup = buildComplianceIconLookup();
  return _complianceIconLookup;
}

export function resolveOperationsIcon(service) {
  // For compliance / Hub Registrar services, match the service name against
  // the Home page Registrations subcategory labels to get a meaningful icon.
  if (service?.serviceType === 'compliance' || service?.category === 'compliance') {
    const name = (service.name || '').toLowerCase();
    const lookup = getComplianceIconLookup();
    // Try direct label match first
    const directMatch = lookup.get(name);
    if (directMatch) return directMatch;
    // Try substring match — service name contains a subcategory label or vice versa
    for (const [label, Icon] of lookup.entries()) {
      if (name.includes(label) || label.includes(name)) return Icon;
    }
  }
  const key = service?.icon || OPERATIONS_CATEGORY_DEFAULT_ICONS[service?.category] || 'Headset';
  return OPERATIONS_ICON_MAP[key] || Headset;
}
