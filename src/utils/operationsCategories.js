export const OPERATIONS_CATEGORY_OPTIONS = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'technology', label: 'Developers' },
  { value: 'sales', label: 'Sales' },
  { value: 'finance', label: 'Finance' },
  { value: 'people', label: 'People & HR' },
  { value: 'support', label: 'Support' },
  { value: 'creative', label: 'Creative' },
  { value: 'growth', label: 'Growth' },
  { value: 'operations', label: 'Operations' },
  { value: 'compliance', label: 'Hub Registrar' },
];

export const OPERATIONS_CATEGORY_LABELS = Object.fromEntries(
  OPERATIONS_CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
);

export const HUB_REGISTRAR_CATEGORY_OPTIONS = [
  { value: 'business_entity', label: 'Business / Entity Registration' },
  { value: 'tax_identity', label: 'Tax and Identity' },
  { value: 'local_licences', label: 'Local Licences' },
  { value: 'msme_udyam', label: 'MSME / Udyam' },
  { value: 'startup_dpiit', label: 'Startup / DPIIT Recognition' },
  { value: 'food_fssai', label: 'Food and FSSAI' },
  { value: 'import_export', label: 'Import / Export' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'technology_saas', label: 'Technology / SaaS / IT' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'fintech', label: 'Financial / FinTech' },
  { value: 'aviation', label: 'Aviation' },
  { value: 'construction_real_estate', label: 'Construction / Real Estate' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'telecom', label: 'Telecom / Communications' },
  { value: 'pharma_chemical', label: 'Pharmaceutical / Chemical' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'logistics_transport', label: 'Logistics / Transport' },
  { value: 'tourism_hospitality', label: 'Tourism / Hospitality' },
  { value: 'entertainment_media', label: 'Entertainment / Media' },
  { value: 'energy_power', label: 'Energy / Solar / Power' },
  { value: 'defence_aerospace', label: 'Defence / Aerospace' },
  { value: 'intellectual_property', label: 'Intellectual Property' },
  { value: 'employer_labour', label: 'Employer / Labour' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'digital_services', label: 'Digital Services' },
  { value: 'other', label: 'Other' },
];

export const HUB_REGISTRAR_CATEGORY_COPY = {
  business_entity: 'Incorporate proprietorships, partnerships, LLPs, private limited companies, and other legal entities.',
  tax_identity: 'PAN, TAN, GST, and professional tax support for compliant tax identity.',
  local_licences: 'Shops & Establishments, trade licences, and municipal permissions.',
  msme_udyam: 'Udyam registration for eligible micro, small, and medium enterprises.',
  startup_dpiit: 'DPIIT Startup recognition for eligible Indian startups.',
  food_fssai: 'FSSAI registration and licensing for food businesses of every scale.',
  import_export: 'IEC, DGFT, and customs-related support for international trade.',
  manufacturing: 'Factory, pollution, and plant-level compliance for manufacturers.',
  technology_saas: 'Entity, GST, and operating registrations for software and IT companies.',
  ecommerce: 'Marketplace and inventory e-commerce compliance, from GST to packaged goods.',
  fintech: 'RBI, SEBI, NBFC, and other activity-specific financial licences.',
  aviation: 'DGCA, operator, drone, and aviation-training approvals.',
  construction_real_estate: 'Contractor licences, building permissions, and RERA support.',
  healthcare: 'Clinical establishment, pharmacy, and medical-device registrations.',
  education: 'School, coaching, college, and EdTech recognition and affiliation support.',
  professional_services: 'Practice setup for CAs, lawyers, doctors, architects, and consultants.',
  telecom: 'DoT, ISP, and communications-related authorisations.',
  pharma_chemical: 'Drug licences, CDSCO, and chemical manufacturing approvals.',
  automotive: 'Vehicle, EV, component, and dealer certification pathways.',
  agriculture: 'FPO, APMC, seed, fertiliser, and agri-trade licences.',
  logistics_transport: 'Transport permits, warehousing, and freight compliance.',
  tourism_hospitality: 'Hotels, travel agencies, homestays, and tourism department registrations.',
  entertainment_media: 'Production, OTT, events, gaming, and media permissions.',
  energy_power: 'Solar, power, EV charging, and electricity-related approvals.',
  defence_aerospace: 'Industrial licences, export controls, and aerospace clearances.',
  intellectual_property: 'Trademark, patent, copyright, and design protection.',
  employer_labour: 'EPFO, ESIC, shops, and labour registrations for employers.',
  environmental: 'Pollution consent, environmental clearance, and waste authorisations.',
  digital_services: 'Website, DSC, and digital operating services for filings and presence.',
};

export const HUB_REGISTRAR_CATEGORY_HIGHLIGHTS = {
  business_entity: ['Private Limited & LLP', 'Partnership & proprietorship', 'Company incorporation'],
  tax_identity: ['GST registration', 'PAN and TAN', 'Professional tax'],
  local_licences: ['Shops & Establishments', 'Trade licence', 'Municipal permissions'],
  msme_udyam: ['Udyam registration', 'MSME benefits', 'Micro, small & medium'],
  startup_dpiit: ['DPIIT recognition', 'Startup India benefits', 'Eligibility filing'],
  food_fssai: ['FSSAI registration', 'State and central licence', 'Food cart to factory'],
  import_export: ['IEC code', 'DGFT support', 'Customs documentation'],
  manufacturing: ['Factory licence', 'Pollution consent', 'Plant-level compliance'],
  technology_saas: ['IT company setup', 'GST for SaaS', 'Operating registrations'],
  ecommerce: ['Marketplace GST', 'Inventory sellers', 'Packaged goods rules'],
  fintech: ['NBFC pathways', 'RBI / SEBI activity', 'Payment licences'],
  aviation: ['DGCA approvals', 'Drone permissions', 'Operator & training'],
  construction_real_estate: ['Contractor licence', 'Building permission', 'RERA support'],
  healthcare: ['Clinic registration', 'Pharmacy licence', 'Medical devices'],
  education: ['School & coaching', 'College affiliation', 'EdTech recognition'],
  professional_services: ['CA / lawyer practice', 'Clinic & consultancy', 'Professional setup'],
  telecom: ['DoT authorisation', 'ISP licences', 'Communications filing'],
  pharma_chemical: ['Drug licence', 'CDSCO filings', 'Chemical manufacturing'],
  automotive: ['Dealer certification', 'EV and components', 'Vehicle approvals'],
  agriculture: ['FPO registration', 'Seed & fertiliser', 'APMC / agri-trade'],
  logistics_transport: ['Transport permits', 'Warehousing', 'Freight compliance'],
  tourism_hospitality: ['Hotel & homestay', 'Travel agency', 'Tourism department'],
  entertainment_media: ['Production permissions', 'OTT and events', 'Gaming & media'],
  energy_power: ['Solar approvals', 'EV charging', 'Electricity licences'],
  defence_aerospace: ['Industrial licence', 'Export controls', 'Aerospace clearance'],
  intellectual_property: ['Trademark filing', 'Patent & design', 'Copyright protection'],
  employer_labour: ['EPFO and ESIC', 'Shops Act', 'Labour registrations'],
  environmental: ['Pollution consent', 'Waste authorisation', 'Environmental clearance'],
  digital_services: ['DSC and e-sign', 'Website presence', 'Digital filings'],
};

export const HUB_REGISTRAR_CATEGORY_PRICES = {
  business_entity: { display: '₹1', numeric: 1 },
  msme_udyam: { display: '₹1', numeric: 1 },
  tax_identity: { display: '₹99', numeric: 99 },
  import_export: { display: '₹999', numeric: 999 },
  local_licences: { display: '₹999', numeric: 999 },
  food_fssai: { display: '₹1,499', numeric: 1499 },
  digital_services: { display: '₹1,999', numeric: 1999 },
  professional_services: { display: '₹1,999', numeric: 1999 },
  ecommerce: { display: '₹2,499', numeric: 2499 },
  education: { display: '₹2,499', numeric: 2499 },
  employer_labour: { display: '₹2,499', numeric: 2499 },
  agriculture: { display: '₹2,499', numeric: 2499 },
  tourism_hospitality: { display: '₹2,499', numeric: 2499 },
  technology_saas: { display: '₹2,999', numeric: 2999 },
  startup_dpiit: { display: '₹2,999', numeric: 2999 },
  intellectual_property: { display: '₹2,999', numeric: 2999 },
  entertainment_media: { display: '₹2,999', numeric: 2999 },
  logistics_transport: { display: '₹2,999', numeric: 2999 },
  manufacturing: { display: '₹4,999', numeric: 4999 },
  construction_real_estate: { display: '₹4,999', numeric: 4999 },
  healthcare: { display: '₹4,999', numeric: 4999 },
  environmental: { display: '₹4,999', numeric: 4999 },
  automotive: { display: '₹4,999', numeric: 4999 },
  energy_power: { display: '₹4,999', numeric: 4999 },
  fintech: { display: '₹7,999', numeric: 7999 },
  pharma_chemical: { display: '₹7,999', numeric: 7999 },
  telecom: { display: '₹7,999', numeric: 7999 },
  aviation: { display: '₹9,999', numeric: 9999 },
  defence_aerospace: { display: '₹9,999', numeric: 9999 },
};

export function getStaticHubRegistrarCategories() {
  const categories = [];
  const seen = new Set();

  HUB_REGISTRAR_CATEGORY_OPTIONS
    .filter((opt) => opt.value !== 'other')
    .forEach((opt) => {
      if (!seen.has(opt.value)) {
        seen.add(opt.value);
        const priceData = HUB_REGISTRAR_CATEGORY_PRICES[opt.value] || { display: '₹999', numeric: 999 };
        categories.push({
          slug: opt.value,
          label: opt.label,
          description: HUB_REGISTRAR_CATEGORY_COPY[opt.value]
            || 'Registration and compliance support for this category.',
          highlights: HUB_REGISTRAR_CATEGORY_HIGHLIGHTS[opt.value] || [],
          price: priceData.display,
          priceNumeric: priceData.numeric,
        });
      }
    });

  categories.sort((a, b) => a.priceNumeric - b.priceNumeric);

  return categories;
}

/** Format API startingPrice into the same display string used on /registrations. */
export function formatHubRegistrarStartingPrice(price) {
  const n = Number(price);
  if (price == null || price === '' || Number.isNaN(n) || n === 0) return '₹999';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Map a public Hub Registrar category API row to the card shape used on the
 * homepage carousel and /registrations. Admin `name` and `startingPrice` are
 * the source of truth; highlights stay local because the API does not send them.
 */
export function mapPublicHubRegistrarCategory(cat) {
  const startingPrice = cat?.startingPrice ?? cat?.starting_price;
  return {
    slug: cat.slug,
    label: cat.name,
    description: cat.description || '',
    price: formatHubRegistrarStartingPrice(startingPrice),
    priceNumeric: Number(startingPrice) || 0,
    highlights: HUB_REGISTRAR_CATEGORY_HIGHLIGHTS[cat.slug] || [],
  };
}

const HUB_REGISTRAR_KNOWN_VALUES = new Set(
  HUB_REGISTRAR_CATEGORY_OPTIONS.map((opt) => opt.value).filter((value) => value !== 'other'),
);

export function slugifyHubRegistrarCategory(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export function humanizeHubRegistrarCategory(slug) {
  return String(slug || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveHubRegistrarCategoryForm(storedCategory) {
  const value = String(storedCategory || '').trim().toLowerCase();
  if (!value || value === 'compliance' || value === 'other') {
    return { category: '', customCategoryName: '' };
  }
  if (HUB_REGISTRAR_KNOWN_VALUES.has(value)) {
    return { category: value, customCategoryName: '' };
  }
  return { category: 'other', customCategoryName: humanizeHubRegistrarCategory(value) };
}

export const HUB_REGISTRAR_CATEGORY_LABELS = Object.fromEntries(
  HUB_REGISTRAR_CATEGORY_OPTIONS
    .filter((opt) => opt.value !== 'other')
    .map((opt) => [opt.value, opt.label]),
);

export function getHubRegistrarCategoryLabel(slug) {
  const value = String(slug || '').trim().toLowerCase();
  if (!value) return '';
  if (HUB_REGISTRAR_CATEGORY_LABELS[value]) return HUB_REGISTRAR_CATEGORY_LABELS[value];
  if (value === 'compliance') return 'Hub Registrar';
  return humanizeHubRegistrarCategory(value);
}

export function isDisplayableHubRegistrarCategory(slug) {
  const value = String(slug || '').trim().toLowerCase();
  return Boolean(value) && value !== 'other' && value !== 'compliance';
}

export function collectHubRegistrarCategories(services) {
  const counts = new Map();
  for (const row of services || []) {
    const slug = String(row?.category || '').trim().toLowerCase();
    if (!isDisplayableHubRegistrarCategory(slug)) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({
      slug,
      label: getHubRegistrarCategoryLabel(slug),
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getHubRegistrarFilterCategoryOptions(services) {
  const known = HUB_REGISTRAR_CATEGORY_OPTIONS
    .filter((opt) => opt.value !== 'other')
    .map((opt) => ({ value: opt.value, label: opt.label }));
  const knownValues = new Set(known.map((opt) => opt.value));
  const extras = collectHubRegistrarCategories(services)
    .filter((item) => !knownValues.has(item.slug))
    .map((item) => ({ value: item.slug, label: item.label }));
  return extras.length ? [...known, ...extras] : known;
}

export {
  getHubRegistrarSubcategories,
  getHubRegistrarSubcategory,
  serviceMatchesHubRegistrarSubcategory,
  matchServicePriceFromApi,
} from './hubRegistrarSubcategories';
