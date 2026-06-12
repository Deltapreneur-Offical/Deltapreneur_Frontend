import {
  Headset, Users, Calculator, Share2, MessageCircle, TrendingUp, Megaphone,
  Code, Server, Layers, ClipboardList, Search, Palette, Film, Database, Briefcase,
  ShieldCheck, Globe, FileCheck, Receipt, Rocket,
} from 'lucide-react';

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

export function resolveOperationsIcon(service) {
  const key = service?.icon || OPERATIONS_CATEGORY_DEFAULT_ICONS[service?.category] || 'Headset';
  return OPERATIONS_ICON_MAP[key] || Headset;
}
