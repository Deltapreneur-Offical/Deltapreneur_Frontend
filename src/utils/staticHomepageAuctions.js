const STATIC_END_OFFSET_MS = 2 * 24 * 60 * 60 * 1000;

function staticEndTime() {
  return new Date(Date.now() + STATIC_END_OFFSET_MS).toISOString();
}

/** Placeholder auctions when no live data — domain, technology, and creator categories. */
export const STATIC_HOMEPAGE_AUCTIONS = [
  {
    category: 'domain',
    id: 'static-home-domain-brandify',
    isStatic: true,
    status: 'ACTIVE',
    minBidPrice: 25000,
    currentHighestBid: 0,
    totalBids: 4,
    endTime: staticEndTime(),
    domain: {
      fullDomain: 'brandify.com',
      domainName: 'brandify',
      domainExtension: '.com',
      verified: true,
      logo: null,
      pricingDemand: 'FIXED_PRICE',
    },
  },
  {
    category: 'technology',
    id: 'static-home-tech-saas',
    isStatic: true,
    status: 'ACTIVE',
    minBidPrice: 85000,
    currentHighestBid: 92000,
    totalBids: 7,
    endTime: staticEndTime(),
    auctionTitle: 'SaaS Analytics Kit',
    imageUrl: null,
    software: {
      name: 'SaaS Analytics Kit',
      verified: true,
      category: 'Analytics',
      description: 'Plug-and-play analytics dashboard for B2B SaaS teams.',
    },
  },
  {
    category: 'community',
    id: 'static-home-creator-aisha',
    isStatic: true,
    status: 'ACTIVE',
    minBidPrice: 15000,
    currentHighestBid: 18000,
    totalBids: 5,
    endTime: staticEndTime(),
    auctionTitle: 'Aisha Mehta',
    imageUrl: null,
    community: {
      name: 'Aisha Mehta',
      niche: 'Content & Brand Strategy',
      bio: 'Creator partnership profile with 120K audience reach.',
    },
  },
  {
    category: 'domain',
    id: 'static-home-domain-launchpad',
    isStatic: true,
    status: 'ACTIVE',
    minBidPrice: 18000,
    currentHighestBid: 22000,
    totalBids: 6,
    endTime: staticEndTime(),
    domain: {
      fullDomain: 'launchpad.io',
      domainName: 'launchpad',
      domainExtension: '.io',
      verified: true,
      logo: null,
      pricingDemand: 'NEGOTIABLE',
    },
  },
];

export function resolveStaticHomeAuctionPath(auction) {
  const paths = {
    domain: '/auctions',
    technology: '/technology',
    community: '/creator',
  };
  return paths[auction?.category] || '/auctions';
}
