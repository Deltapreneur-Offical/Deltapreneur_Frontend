import DomainCard from '../domain/DomainCard';

/**
 * OpenProvider Premium Showcase card (customer-facing).
 *
 * Thin adapter — reuses the shared DomainCard (the exact card used for
 * search-result premium domains), so showcase and search premium cards share
 * ONE UI source of truth and no card markup is duplicated.
 *
 * The provider origin (registry / Afternic / Sedo) is INTERNAL ONLY — it is
 * carried through the shared cart metadata so backend revalidation and
 * managed-acquisition confirm route the purchase correctly, but it is never
 * rendered. Add to Cart always uses the DOMAIN_REGISTRATION flow (never
 * marketplace escrow). Managed Acquisition (>₹5L) messaging renders through
 * the shared DomainCard when the flag is set.
 */
export default function ShowcaseDomainCard({ item, shareContext = null, stackPremiumBadge = false }) {
  const fullDomain = String(item.domainName || '').toLowerCase().trim();
  const tld = String(
    item.tld ||
      (item.extension ? item.extension.replace(/^\./, '') : '') ||
      (fullDomain.includes('.') ? fullDomain.split('.').slice(1).join('.') : ''),
  ).replace(/^\./, '');

  return (
    <DomainCard
      stackPremiumBadge={stackPremiumBadge}
      item={{
        domain: fullDomain,
        name: item.name,
        tld,
        status: 'available',
        available: true,
        isPremium: true,
        registryTier: 'premium',
        registrationPriceInr: item.priceInr ?? item.createPriceInr ?? item.askingPrice,
        totalInr: item.payableInr ?? item.totalInr,
        renewalPriceInr: item.renewalPriceInr,
        renewalTotalInr: item.renewalTotalInr,
        premiumProvider: item.premiumProvider,
        // NOTE: managedAcquisition is intentionally NOT passed to the shared
        // card so the Showcase card never renders the Managed Acquisition
        // panel — matching the Main Premium Domain card UI exactly. The
        // underlying managed-acquisition logic (pricing, cart metadata,
        // checkout, ₹5L rule) is fully preserved on the backend.
      }}
      className="h-full"
      shareContext={shareContext}
    />
  );
}
