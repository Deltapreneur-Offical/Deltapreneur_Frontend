import { DomainCardGrid } from '../domain/DomainCard';

/**
 * Post-fetch commerce UI for AI Brand Names.
 * Generation/availability pipeline stays in the AI backend; once results arrive,
 * available domains use the same DomainCard as Homepage Domain Names / Storefront.
 */
function mapAiResultToCards(item) {
  const cards = [];
  const style = item.style || item.brand_category || null;
  const name = item.name;

  const cardFor = (domain, tld, available, status, price) => {
    if (!domain) return;
    const isAvailable = available === true;
    cards.push({
      domain,
      name,
      tld,
      status: isAvailable ? 'available' : (status === 'unknown' || status === 'checking' ? 'error' : (status || 'taken')),
      available: isAvailable,
      registrationPrice: price,
      style,
    });
  };

  cardFor(item.domain_com, 'com', item.com_available, item.com_status, item.com_price_inr);
  cardFor(item.domain_in, 'in', item.in_available, item.in_status, item.in_price_inr);
  return cards;
}

export default function AIDomainGrid({ results, shareContext = null }) {
  if (!results?.length) return null;

  const cards = results.flatMap(mapAiResultToCards);
  if (cards.length === 0) {
    return (
      <p className="text-left text-gray-500 text-sm py-4">
        No available domains found for these brand ideas. Try a different description.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <DomainCardGrid items={cards} featuredFirst={false} showStyleBadge shareContext={shareContext} />
    </div>
  );
}
