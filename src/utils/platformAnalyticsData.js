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

function ownerDetails(owner) {
  if (!owner) return { name: '—', email: null };
  const name = [owner.firstname, owner.lastname].filter(Boolean).join(' ').trim();
  const email = owner.email || null;
  if (name && email) return { name, email };
  if (name) return { name, email: null };
  if (email) return { name: email, email: null };
  return { name: '—', email: null };
}

function ownerLabel(owner) {
  const { name, email } = ownerDetails(owner);
  if (name !== '—' && email) return `${name} (${email})`;
  return name;
}

function withOwnerFields(ownerSource) {
  const details = ownerDetails(ownerSource);
  return {
    owner: ownerLabel(ownerSource),
    ownerName: details.name,
    ownerEmail: details.email,
  };
}

function parseAnalyticsDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
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
    ...withOwnerFields(row.listedBy ?? row.listed_by),
    createdAt: row.createdAt ?? row.created_at ?? row.verifiedAt ?? row.verified_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
    soldAt: row.soldAt ?? row.sold_at ?? null,
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
    ...withOwnerFields(row.listedBy ?? row.listed_by),
  };
}

function normalizeTechnology(row) {
  return {
    id: String(row.id),
    name: row.name ?? 'Technology',
    category: formatTechnologyCategoryLabel(row.category),
    verified: Boolean(row.verified),
    views: Number(row.views ?? row.view_count ?? 0),
    ...withOwnerFields(row.listedBy ?? row.listed_by),
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
    ...withOwnerFields(row.listedBy ?? row.appUser ?? row.user),
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
  try {
    const response = await communityAPI.getMy();
    const profile = response.data?.data ?? response.data ?? null;
    return profile ? [normalizeCreator(profile)] : [];
  } catch (err) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
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

function formatActivityBucketLabel(date, period) {
  if (period === 'monthly') {
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function activityBucketConfig(period) {
  if (period === 'monthly') {
    return { count: 6, stepMs: 30 * 86_400_000 };
  }
  if (period === 'weekly') {
    return { count: 12, stepMs: 7 * 86_400_000 };
  }
  return { count: 30, stepMs: 86_400_000 };
}

function resolveActivityDate(row, tab) {
  if (tab === 'sold') {
    if (String(row.status ?? '').toUpperCase() !== 'SOLD') return null;
    return (
      parseAnalyticsDate(row.soldAt)
      || parseAnalyticsDate(row.updatedAt)
      || parseAnalyticsDate(row.createdAt)
    );
  }

  if (tab === 'newListings') {
    return parseAnalyticsDate(row.createdAt) || parseAnalyticsDate(row.updatedAt);
  }

  return (
    parseAnalyticsDate(row.updatedAt)
    || parseAnalyticsDate(row.createdAt)
  );
}

function buildActivityBuckets(period, eventDates) {
  const { count } = activityBucketConfig(period);
  const today = startOfDay(new Date());
  const defaultStart = today.getTime() - (count - 1) * activityBucketConfig(period).stepMs;

  let startMs = defaultStart;
  if (eventDates.length) {
    startMs = Math.min(startMs, Math.min(...eventDates.map((date) => startOfDay(date).getTime())));
  }

  return Array.from({ length: count }, (_, index) => {
    const fraction = count > 1 ? index / (count - 1) : 1;
    const date = startOfDay(new Date(startMs + fraction * (today.getTime() - startMs)));
    return {
      date,
      name: formatActivityBucketLabel(date, period),
      value: 0,
    };
  });
}

function assignActivityBucketIndex(buckets, date) {
  if (!buckets.length) return -1;
  const value = startOfDay(date).getTime();
  const start = buckets[0].date.getTime();
  const end = buckets[buckets.length - 1].date.getTime();
  if (value < start || value > end + 86_400_000) return -1;
  if (end === start) return 0;
  const ratio = (value - start) / (end - start);
  return Math.min(buckets.length - 1, Math.max(0, Math.round(ratio * (buckets.length - 1))));
}

export function buildDomainActivitySeries(rows, tab, period) {
  const eventDates = rows
    .map((row) => resolveActivityDate(row, tab))
    .filter(Boolean);

  const buckets = buildActivityBuckets(period, eventDates);

  rows.forEach((row) => {
    if (tab === 'views') {
      const activityDate = resolveActivityDate(row, tab);
      if (!activityDate) return;
      const index = assignActivityBucketIndex(buckets, activityDate);
      if (index >= 0) buckets[index].value += Number(row.views || 0);
      return;
    }

    if (tab === 'newListings') {
      const activityDate = resolveActivityDate(row, tab);
      if (!activityDate) return;
      const index = assignActivityBucketIndex(buckets, activityDate);
      if (index >= 0) buckets[index].value += 1;
      return;
    }

    const soldDate = resolveActivityDate(row, tab);
    if (!soldDate) return;
    const index = assignActivityBucketIndex(buckets, soldDate);
    if (index >= 0) buckets[index].value += 1;
  });

  return buckets.map(({ name, value }) => ({ name, value }));
}

export function computeDomainActivityMetrics(series) {
  const values = series.map((point) => point.value);
  const total = values.reduce((sum, value) => sum + value, 0);
  const avg = values.length ? Math.round(total / values.length) : 0;

  let highest = 0;
  let lowest = 0;
  let highestLabel = '—';
  let lowestLabel = '—';
  let hasLowest = false;

  series.forEach(({ name, value }) => {
    if (value > highest) {
      highest = value;
      highestLabel = name;
    }
    if (value > 0 && (!hasLowest || value < lowest)) {
      lowest = value;
      lowestLabel = name;
      hasLowest = true;
    }
  });

  return {
    avg,
    highest,
    lowest: hasLowest ? lowest : 0,
    total,
    highestLabel,
    lowestLabel,
  };
}

export function buildTopDomainsRanked(rows, limit = 5) {
  const sorted = [...rows].sort((a, b) => b.views - a.views).slice(0, limit);
  const maxViews = sorted[0]?.views || 1;
  return sorted.map((row, index) => ({
    rank: index + 1,
    name: row.name,
    views: row.views,
    percent: maxViews > 0 ? Math.round((row.views / maxViews) * 100) : 0,
  }));
}

export function pieDataWithPercentages(data) {
  const total = (data ?? []).reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return [];
  return data.map((item) => ({
    ...item,
    percent: Math.round((Number(item.value || 0) / total) * 100),
  }));
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
