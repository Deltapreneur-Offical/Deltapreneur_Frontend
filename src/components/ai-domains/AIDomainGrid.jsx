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

  if (item.com_available && item.domain_com) {
    cards.push({
      domain: item.domain_com,
      name,
      tld: 'com',
      status: 'available',
      available: true,
      registrationPrice: item.com_price_inr,
      style,
    });
  }
  if (item.in_available && item.domain_in) {
    cards.push({
      domain: item.domain_in,
      name,
      tld: 'in',
      status: 'available',
      available: true,
      registrationPrice: item.in_price_inr,
      style,
    });
  }
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
