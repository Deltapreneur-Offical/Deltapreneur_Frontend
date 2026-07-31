/** Platform fee waiver roles (creation + bid placement). Winner payment still required. */
export function roleWaivesAuctionPlatformFees(role) {
  const text = String(role ?? '').toUpperCase().replace(/^ROLE_/, '');
  return text === 'ADMIN' || text === 'SUPER_ADMIN';
}
