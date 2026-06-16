import { asArray } from './asArray';
import { isCreatorProfileComplete } from './creatorProfile';
import { isPublicMarketplaceListing } from './listingVisibility';

/** Whether a listing is visible on marketplace browse pages and can be homepage-featured. */
export function isActiveListing(item, type = 'domain') {
  if (!item) return false;
  if (item.takenDown === true || item.taken_down === true) return false;
  if (item.deleted === true || item.isDeleted === true || item.is_deleted === true) return false;
  if (item.active === false) return false;

  // Domains, ventures, and software use boolean `status` for marketplace visibility.
  if (item.status === false) return false;

  if (type === 'domain') {
    const domainStatus = (item.domainStatus ?? item.domain_status ?? '').toString().toUpperCase();
    if (domainStatus === 'SOLD' || domainStatus === 'REMOVED' || domainStatus === 'DELETED') {
      return false;
    }
  }

  if (type === 'software') {
    const softwareStatus = (item.softwareStatus ?? item.software_status ?? '').toString().toUpperCase();
    if (softwareStatus === 'SOLD' || softwareStatus === 'REMOVED' || softwareStatus === 'DELETED') {
      return false;
    }
  }

  if (type === 'community') {
    const profileStatus = (item.status ?? '').toString().toUpperCase();
    if (['REMOVED', 'DELETED', 'INACTIVE'].includes(profileStatus)) return false;
  }

  return true;
}

/** Verified listings only — homepage preview rows hide unverified cards. */
export function isHomepageVerifiedListing(item, type = 'domain') {
  if (!item) return false;
  if (type === 'domain') return Boolean(item.verified);
  if (type === 'software') return Boolean(item.verified);
  if (type === 'venture') {
    const status = item.listingApprovalStatus ?? item.listing_approval_status;
    return status === 'APPROVED';
  }
  if (type === 'community') {
    return isCreatorProfileComplete(item);
  }
  return Boolean(item.verified);
}

function normalizeRole(role) {
  return (role ?? '').toString().toUpperCase().replace(/^ROLE_/, '');
}

/** Owner account that created the listing. */
export function getListingOwner(item, type = 'domain') {
  if (!item) return null;
  if (type === 'community') return item.appUser ?? item.listedBy ?? item.user ?? null;
  if (type === 'venture') return item.listedBy ?? item.venture?.listedBy ?? null;
  return item.listedBy ?? null;
}

const ADMIN_ROLES = new Set([
  'ADMIN',
  'COBROTHER',
  'SUPER_ADMIN',
  'ADMINISTRATOR',
  'ROLE_ADMIN',
  'ROLE_COBROTHER',
  'ROLE_SUPER_ADMIN',
  'ROLE_ADMINISTRATOR',
]);

/** True when listing was created by admin / official catalog (not a guest user listing). */
export function isAdminCreatedListing(item, type = 'domain') {
  if (!item) return false;
  if (item.adminListed === true || item.admin_listed === true) return true;
  if (item.official === true) return true;
  if (item.createdByAdmin === true || item.adminCreated === true) return true;

  const owner = getListingOwner(item, type);
  if (!owner) return false;

  const role = normalizeRole(owner.role);
  if (ADMIN_ROLES.has(role)) return true;

  // Some payloads expose admin/co-brother flags directly on owner objects.
  if (owner.isAdmin === true || owner.admin === true || owner.isCoBrother === true) return true;

  return false;
}

/** Guest-user listings only (excludes admin-created listings). */
export function isGuestCreatedListing(item, type = 'domain') {
  if (!isActiveListing(item, type)) return false;
  if (isAdminCreatedListing(item, type)) return false;

  const owner = getListingOwner(item, type);
  if (!owner) return false;

  const role = normalizeRole(owner.role);
  return !ADMIN_ROLES.has(role);
}

/** Homepage cards pinned via Admin → Homepage Features (admin + user listings). */
export function isHomepageFeaturedListing(item, type = 'domain') {
  return isActiveListing(item, type) && Boolean(item.featured);
}

export function filterHomepageListings(items, type = 'domain') {
  return asArray(items).filter((item) => isPublicMarketplaceListing(item, type));
}

export function filterFeaturedListings(items, type = 'domain') {
  return asArray(items).filter((item) => isHomepageFeaturedListing(item, type));
}

/** Homepage hero rows: admin-featured listings only (max 5). */
export const HOMEPAGE_PREVIEW_LIMIT = 5;

export function pickHomepagePreviewListings(
  items,
  type = 'domain',
  limit = HOMEPAGE_PREVIEW_LIMIT,
) {
  return asArray(items)
    .filter((item) => isHomepageFeaturedListing(item, type))
    .slice(0, limit);
}

/** @deprecated Use filterFeaturedListings — kept for callers not yet migrated */
export function filterFeaturedGuestListings(items, type = 'domain') {
  return filterFeaturedListings(items, type);
}
