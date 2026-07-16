import { Globe, Cpu, Rocket, ShoppingBag } from 'lucide-react';

export const CART_PRODUCT_META = {
  DOMAIN_LISTING: {
    label: 'Domain',
    icon: Globe,
    accent: '#0ea5e9',
    tint: '#0ea5e914',
  },
  TECHNOLOGY: {
    label: 'Technology',
    icon: Cpu,
    accent: '#7c3aed',
    tint: '#7c3aed14',
  },
  DOMAIN_REGISTRATION: {
    label: 'Domain Registration',
    icon: Globe,
    accent: '#059669',
    tint: '#05966914',
  },
  VENTURE_DEAL: {
    label: 'Venture',
    icon: Rocket,
    accent: '#4f46e5',
    tint: '#4f46e514',
  },
};

export function getCartProductMeta(productType) {
  return CART_PRODUCT_META[productType] || {
    label: productType || 'Product',
    icon: ShoppingBag,
    accent: '#374151',
    tint: '#37415114',
  };
}
