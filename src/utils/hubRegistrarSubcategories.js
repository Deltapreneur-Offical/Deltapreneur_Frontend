function slugifyServiceName(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function item(label, aliases = []) {
  return {
    slug: slugifyServiceName(label),
    label,
    aliases: aliases.map((alias) => slugifyServiceName(alias)).filter(Boolean),
  };
}

export const HUB_REGISTRAR_SUBCATEGORIES = {
  business_entity: [
    item('Proprietorship Registration', ['sole proprietorship', 'proprietorship']),
    item('Partnership Firm Registration', ['partnership registration', 'partnership firm']),
    item('LLP Registration', ['limited liability partnership', 'llp']),
    item('Private Limited Company Registration', ['private limited', 'pvt ltd', 'private limited company']),
    item('One Person Company (OPC) Registration', ['opc registration', 'one person company', 'opc']),
    item('Public Limited Company Registration', ['public limited', 'public limited company']),
    item('Section 8 Company Registration', ['section 8', 'section 8 company']),
    item('Producer Company Registration', ['producer company']),
    item('Trust Registration', ['trust']),
    item('Society Registration', ['society']),
    item('Other Entity Registration Services', ['other entity']),
  ],
  tax_identity: [
    item('PAN Application', ['pan card', 'pan registration', 'pan']),
    item('TAN Registration', ['tan']),
    item('GST Registration', ['gst']),
    item('GST Amendment', ['gst update']),
    item('GST Cancellation'),
    item('GST Return Filing', ['gst returns', 'gstr']),
    item('Professional Tax Registration', ['professional tax', 'pt registration']),
    item('Tax Identification Services'),
    item('Other Tax Compliance Services', ['other tax']),
  ],
  local_licences: [
    item('Shop & Establishment Registration', ['shops and establishments', 'shop and establishment', 'shops act']),
    item('Trade Licence', ['trade license']),
    item('Municipal Licence', ['municipal license']),
    item('Local Business Permits'),
    item('Signboard Licence', ['signboard license']),
    item('Health Trade Licence', ['health trade license']),
    item('Fire-related Local Permissions', ['fire noc', 'fire licence']),
    item('Other Municipal Permissions', ['other municipal']),
  ],
  msme_udyam: [
    item('Udyam Registration', ['udyam', 'msme registration']),
    item('Udyam Certificate Update'),
    item('Udyam Amendment'),
    item('MSME Certificate Services', ['msme certificate']),
    item('MSME Related Compliance Services', ['msme compliance']),
  ],
  startup_dpiit: [
    item('DPIIT Startup Recognition', ['dpiit', 'startup recognition']),
    item('Startup Recognition Application'),
    item('Startup Certificate'),
    item('Startup Recognition Amendment'),
    item('Startup Compliance Support'),
  ],
  food_fssai: [
    item('FSSAI Basic Registration', ['fssai registration', 'fssai basic']),
    item('FSSAI State Licence', ['fssai state license', 'fssai state']),
    item('FSSAI Central Licence', ['fssai central license', 'fssai central']),
    item('FSSAI Licence Renewal', ['fssai renewal']),
    item('FSSAI Modification', ['fssai amendment']),
    item('FSSAI Annual Return'),
    item('FSSAI Related Compliance', ['fssai compliance']),
  ],
  import_export: [
    item('Import Export Code (IEC)', ['iec', 'import export code', 'iec registration']),
    item('IEC Modification', ['iec amendment', 'iec update']),
    item('DGFT Registration', ['dgft']),
    item('DGFT Related Services'),
    item('Import / Export Compliance', ['import export compliance']),
    item('Customs-related Services', ['customs']),
  ],
  manufacturing: [
    item('Factory Licence', ['factory license']),
    item('Factory Registration'),
    item('Pollution Control Registration'),
    item('Pollution Consent', ['consent to operate', 'consent to establish']),
    item('Plant-related Compliance'),
    item('Manufacturing Licences', ['manufacturing licenses']),
    item('Other Factory Compliance Services'),
  ],
  technology_saas: [
    item('IT Company Registration'),
    item('SaaS Business Registration'),
    item('GST for Software / SaaS'),
    item('STPI / SEZ Registrations', ['stpi', 'sez']),
    item('Technology Operating Licences'),
    item('Other IT / SaaS Compliance'),
  ],
  ecommerce: [
    item('E-commerce GST Registration'),
    item('Marketplace Seller Registration'),
    item('Inventory E-commerce Compliance'),
    item('Packaged Commodities Registration'),
    item('Other E-commerce Compliance'),
  ],
  fintech: [
    item('NBFC Registration', ['nbfc']),
    item('Payment Aggregator / Gateway Licence'),
    item('RBI Related Registrations', ['rbi']),
    item('SEBI Related Registrations', ['sebi']),
    item('FinTech Activity Licences'),
    item('Other Financial Compliance'),
  ],
  aviation: [
    item('DGCA Approvals', ['dgca']),
    item('Aircraft Operator Licence'),
    item('Drone / UIN Registration', ['drone registration', 'uin']),
    item('Aviation Training Approvals'),
    item('Other Aviation Compliance'),
  ],
  construction_real_estate: [
    item('Contractor Licence', ['contractor license']),
    item('Building Permission'),
    item('RERA Registration', ['rera']),
    item('Real Estate Project Registration'),
    item('Other Construction Compliance'),
  ],
  healthcare: [
    item('Clinical Establishment Registration'),
    item('Pharmacy Licence', ['drug licence pharmacy']),
    item('Medical Device Registration'),
    item('Clinic / Hospital Registration'),
    item('Other Healthcare Compliance'),
  ],
  education: [
    item('School Recognition'),
    item('Coaching Centre Registration'),
    item('College Affiliation Support'),
    item('EdTech Registration'),
    item('Other Education Compliance'),
  ],
  professional_services: [
    item('CA Practice Setup'),
    item('Law Firm Registration'),
    item('Doctor / Clinic Practice Setup'),
    item('Architect / Consultant Registration'),
    item('Other Professional Practice Services'),
  ],
  telecom: [
    item('DoT Authorisation', ['dot']),
    item('ISP Licence', ['isp']),
    item('Telecom Operating Licence'),
    item('Communications Registrations'),
    item('Other Telecom Compliance'),
  ],
  pharma_chemical: [
    item('Drug Licence', ['drug license']),
    item('CDSCO Registration', ['cdsco']),
    item('Chemical Manufacturing Licence'),
    item('Pharmaceutical Plant Approvals'),
    item('Other Pharma / Chemical Compliance'),
  ],
  automotive: [
    item('Vehicle Dealer Registration'),
    item('EV Manufacturing / Dealer Approvals', ['ev dealer']),
    item('Auto Component Certification'),
    item('Automotive Type Approval Support'),
    item('Other Automotive Compliance'),
  ],
  agriculture: [
    item('FPO Registration', ['fpo']),
    item('APMC / Mandi Licence', ['apmc']),
    item('Seed Licence'),
    item('Fertiliser Licence'),
    item('Other Agri-trade Compliance'),
  ],
  logistics_transport: [
    item('Transport Permit'),
    item('Goods Carriage Permit'),
    item('Warehousing Registration'),
    item('Freight Forwarder Registration'),
    item('Other Logistics Compliance'),
  ],
  tourism_hospitality: [
    item('Hotel Registration'),
    item('Homestay Registration'),
    item('Travel Agency Registration'),
    item('Tourism Department Registration'),
    item('Other Hospitality Compliance'),
  ],
  entertainment_media: [
    item('Production House Registration'),
    item('OTT / Media Permissions'),
    item('Event Licence'),
    item('Gaming Registration'),
    item('Other Media Compliance'),
  ],
  energy_power: [
    item('Solar Project Approvals'),
    item('Electricity Connection / Licence'),
    item('EV Charging Station Registration'),
    item('Power Project Compliance'),
    item('Other Energy Compliance'),
  ],
  defence_aerospace: [
    item('Industrial Licence'),
    item('Defence Manufacturing Approvals'),
    item('Export Control Registrations'),
    item('Aerospace Clearances'),
    item('Other Defence / Aerospace Compliance'),
  ],
  intellectual_property: [
    item('Trademark Filing', ['trademark registration', 'trademark']),
    item('Patent Filing', ['patent']),
    item('Copyright Registration', ['copyright']),
    item('Design Registration', ['industrial design']),
    item('Other IP Protection Services'),
  ],
  employer_labour: [
    item('EPFO Registration', ['epfo', 'pf registration']),
    item('ESIC Registration', ['esic']),
    item('Shops and Establishment for Employers'),
    item('Labour Licence'),
    item('Other Employer Compliance'),
  ],
  environmental: [
    item('Pollution Consent', ['consent to operate', 'consent to establish']),
    item('Environmental Clearance'),
    item('Waste Authorisation'),
    item('Hazardous Waste Registration'),
    item('Other Environmental Compliance'),
  ],
  digital_services: [
    item('Digital Signature Certificate (DSC)', ['dsc', 'digital signature']),
    item('Website / Domain Compliance'),
    item('Digital Filing Support'),
    item('eSign / eKYC Services'),
    item('Other Digital Operating Services'),
  ],
};

export function getHubRegistrarSubcategories(categorySlug) {
  return HUB_REGISTRAR_SUBCATEGORIES[String(categorySlug || '').trim()] || [];
}

export function getHubRegistrarSubcategory(categorySlug, subcategorySlug) {
  const wanted = slugifyServiceName(subcategorySlug);
  return getHubRegistrarSubcategories(categorySlug).find((row) => row.slug === wanted) || null;
}

function slugsRelated(nameSlug, targetSlug) {
  if (!nameSlug || !targetSlug) return false;
  if (nameSlug === targetSlug) return true;
  if (Math.min(nameSlug.length, targetSlug.length) < 12) return false;
  return nameSlug.startsWith(`${targetSlug}_`) || targetSlug.startsWith(`${nameSlug}_`);
}

export function serviceMatchesHubRegistrarSubcategory(service, categorySlug, subcategorySlug) {
  if (!service || !categorySlug || !subcategorySlug) return false;

  const storedCategory = String(service.category || '').trim().toLowerCase();
  const isUncategorized = !storedCategory || storedCategory === 'compliance';
  if (!isUncategorized && storedCategory !== categorySlug) return false;

  const sub = getHubRegistrarSubcategory(categorySlug, subcategorySlug);
  if (!sub) return false;

  const nameSlug = slugifyServiceName(service.name);
  if (slugsRelated(nameSlug, sub.slug)) return true;
  return (sub.aliases || []).some((alias) => slugsRelated(nameSlug, alias) || nameSlug === alias);
}

export { slugifyServiceName };
