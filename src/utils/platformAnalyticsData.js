import {
  adminAPI,
  communityAPI,
  domainAPI,
  technologyAPI,
  ventureAPI,
} from '../api/services';
import { extractAdminList, asArray } from './asArray';
import { extractDomainList } from './domainApiAdapter';
import { evaluateCreatorProfileCompletion } from './creatorProfile';
import { formatTechnologyCategoryLabel } from '../constants/listingCategories';

export const ANALYTICS_CATEGORIES = ['domains', 'ventures', 'technology', 'creators'];

export function isAnalyticsCategory(value) {
  return ANALYTICS_CATEGORIES.includes(value);
}

function ownerLabel(owner) {
  if (!owner) return '—';
  const name = [owner.firstname, owner.lastname].filter(Boolean).join(' ').trim();
  if (name && owner.email) return `${name} (${owner.email})`;
  return name || owner.email || '—';
}

function normalizeDomain(row) {
  const name = `${row.domainName ?? row.domain_name ?? ''}${row.domainExtension ?? row.domain_extension ?? ''}`.trim();
  return {
    id: String(row.id),
    name: name || 'Domain',
    status: row.domainStatus ?? row.domain_status ?? 'UNKNOWN',
    saleType: row.saleType ?? row.sale_type ?? '—',
    verified: Boolean(row.verified),
    views: Number(row.views ?? row.view_count ?? 0),
    owner: ownerLabel(row.listedBy ?? row.listed_by),
  };
}

function normalizeVenture(row) {
  const brand = row.brandDetails ?? row.brand_details ?? {};
  return {
    id: String(row.id),
    name: brand.brandName ?? brand.brand_name ?? row.name ?? 'Venture',
    status: row.saleType ?? row.sale_type ?? '—',
    saleType: row.saleType ?? row.sale_type ?? '—',
    verified: Boolean(row.verified),
    views: Number(row.views ?? row.view_count ?? 0),
    applications: Number(row.applicationCount ?? row.application_count ?? 0),
    owner: ownerLabel(row.listedBy ?? row.listed_by),
  };
}

function normalizeTechnology(row) {
  return {
    id: String(row.id),
    name: row.name ?? 'Technology',
    category: formatTechnologyCategoryLabel(row.category),
    verified: Boolean(row.verified),
    views: Number(row.views ?? row.view_count ?? 0),
    owner: ownerLabel(row.listedBy ?? row.listed_by),
  };
}

function normalizeCreator(row) {
  const completion = evaluateCreatorProfileCompletion(row);
  return {
    id: String(row.id),
    name: row.name ?? 'Creator',
    status: completion.isComplete ? 'Complete' : 'Incomplete',
    role: row.role ?? '—',
    industry: row.industry ?? '—',
    verified: completion.isComplete,
    profileComplete: completion.isComplete,
    views: Number(row.views ?? row.view_count ?? 0),
    owner: ownerLabel(row.listedBy ?? row.appUser ?? row.user),
  };
}

const NORMALIZERS = {
  domains: normalizeDomain,
  ventures: normalizeVenture,
  technology: normalizeTechnology,
  creators: normalizeCreator,
};

async function fetchAdminCategoryRows(category) {
  const fetchers = {
    domains: adminAPI.getDomains,
    ventures: adminAPI.getVentures,
    technology: adminAPI.getTechnologies,
    creators: adminAPI.getCommunities,
  };
  const response = await fetchers[category]();
  return extractAdminList(response.data).map(NORMALIZERS[category]);
}

async function fetchUserCategoryRows(category) {
  if (category === 'domains') {
    const response = await domainAPI.getMyListings();
    return extractDomainList(response.data).map(normalizeDomain);
  }
  if (category === 'ventures') {
    const response = await ventureAPI.getMyVentures();
    return asArray(response.data).map(normalizeVenture);
  }
  if (category === 'technology') {
    const response = await technologyAPI.getMyListings();
    return asArray(response.data).map(normalizeTechnology);
  }
  const response = await communityAPI.getMy();
  const profile = response.data?.data ?? response.data ?? null;
  return profile ? [normalizeCreator(profile)] : [];
}

export async function fetchPlatformAnalyticsRows(category, isAdmin) {
  if (!isAnalyticsCategory(category)) {
    throw new Error('Invalid analytics category');
  }
  return isAdmin ? fetchAdminCategoryRows(category) : fetchUserCategoryRows(category);
}

export function formatChartLabel(value) {
  if (value == null) return 'Unknown';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function countByField(rows, field) {
  const counts = {};
  rows.forEach((row) => {
    const key = formatChartLabel(row[field] ?? 'Unknown');
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function countByBoolean(rows, field, trueLabel, falseLabel) {
  let trueCount = 0;
  let falseCount = 0;
  rows.forEach((row) => {
    if (row[field]) trueCount += 1;
    else falseCount += 1;
  });
  return [
    { name: trueLabel, value: trueCount },
    { name: falseLabel, value: falseCount },
  ].filter((item) => item.value > 0);
}

export function topRowsByViews(rows, limit = 8) {
  return [...rows]
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map((row) => ({
      name: row.name.length > 22 ? `${row.name.slice(0, 22)}…` : row.name,
      views: row.views,
    }))
    .filter((item) => item.views > 0);
}

export function buildCategoryCharts(category, rows) {
  if (category === 'domains') {
    return {
      distribution: countByField(rows, 'status'),
      secondary: countByField(rows, 'saleType'),
      verification: countByBoolean(rows, 'verified', 'Verified', 'Unverified'),
      views: topRowsByViews(rows),
    };
  }
  if (category === 'ventures') {
    return {
      distribution: countByField(rows, 'saleType'),
      secondary: countByBoolean(rows, 'verified', 'Verified', 'Unverified'),
      verification: countByField(rows, 'status'),
      views: topRowsByViews(rows),
    };
  }
  if (category === 'technology') {
    return {
      distribution: countByBoolean(rows, 'verified', 'Verified', 'Unverified'),
      secondary: countByField(rows, 'category'),
      verification: countByField(rows, 'category'),
      views: topRowsByViews(rows),
    };
  }
  return {
    distribution: countByBoolean(rows, 'profileComplete', 'Complete', 'Incomplete'),
    secondary: countByField(rows, 'industry'),
    verification: countByField(rows, 'role'),
    views: topRowsByViews(rows),
  };
}

export function getCategoryTableColumns(category, isAdmin, t) {
  const ownerColumn = isAdmin
    ? [{ key: 'owner', label: t('platformAnalyticsColCreatedBy') }]
    : [];

  if (category === 'domains') {
    return [
      { key: 'name', label: t('platformAnalyticsColListing') },
      { key: 'status', label: t('platformAnalyticsColStatus') },
      { key: 'saleType', label: t('platformAnalyticsColType') },
      { key: 'verified', label: t('platformAnalyticsColVerified'), format: (value) => (value ? t('adminVerified') : t('adminNotVerified')) },
      { key: 'views', label: t('platformAnalyticsColViews') },
      ...ownerColumn,
    ];
  }
  if (category === 'ventures') {
    return [
      { key: 'name', label: t('platformAnalyticsColListing') },
      { key: 'saleType', label: t('platformAnalyticsColType') },
      { key: 'verified', label: t('platformAnalyticsColVerified'), format: (value) => (value ? t('adminVerified') : t('adminNotVerified')) },
      { key: 'applications', label: t('platformAnalyticsColApplications') },
      { key: 'views', label: t('platformAnalyticsColViews') },
      ...ownerColumn,
    ];
  }
  if (category === 'technology') {
    return [
      { key: 'name', label: t('platformAnalyticsColListing') },
      { key: 'category', label: t('platformAnalyticsColCategories') },
      { key: 'verified', label: t('platformAnalyticsColVerified'), format: (value) => (value ? t('adminVerified') : t('adminNotVerified')) },
      { key: 'views', label: t('platformAnalyticsColViews') },
      ...ownerColumn,
    ];
  }
  return [
    { key: 'name', label: t('platformAnalyticsColListing') },
    { key: 'role', label: t('platformAnalyticsColRole') },
    { key: 'industry', label: t('platformAnalyticsColIndustry') },
    { key: 'status', label: t('platformAnalyticsColProfileStatus') },
    { key: 'views', label: t('platformAnalyticsColViews') },
    ...ownerColumn,
  ];
}

export function getCategoryTitle(category, t) {
  const titles = {
    domains: t('domains'),
    ventures: t('ventures'),
    technology: t('technology'),
    creators: t('disruptors'),
  };
  return titles[category] ?? category;
}
