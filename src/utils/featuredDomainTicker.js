import { domainAPI } from '../api/services';
import { extractDomainList } from './domainApiAdapter';
import { fetchAllListPages } from './listPagination';
import { resolveDomainDisplay } from './domainDisplay';
import { filterFeaturedListings } from './homepageListings';

function formatTickerOwner(listedBy) {
  if (!listedBy || typeof listedBy !== 'object') return 'CoBrother seller';
  if (listedBy.username) return `@${listedBy.username}`;
  const name = [listedBy.firstname, listedBy.lastname].filter(Boolean).join(' ').trim();
  if (name) return name;
  const emailLocal = listedBy.email?.split('@')[0]?.trim();
  if (emailLocal) return `@${emailLocal}`;
  return 'CoBrother seller';
}

/** Map a marketplace domain row to a compact ticker card item. */
export function mapDomainToTickerItem(domain) {
  const display = resolveDomainDisplay(domain);
  const statusKey = String(domain.domainStatus ?? '').toUpperCase();
  return {
    id: String(domain.id),
    domain: display.fullDomain,
    status: statusKey === 'SOLD' ? 'sold' : 'live',
    owner: formatTickerOwner(domain.listedBy),
  };
}

export async function fetchFeaturedDomainTickerItems() {
  const items = await fetchAllListPages((params) => domainAPI.getAll(params));
  const domains = extractDomainList({ items, data: items });
  return filterFeaturedListings(domains, 'domain').map(mapDomainToTickerItem);
}
