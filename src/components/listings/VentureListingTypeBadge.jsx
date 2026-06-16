import { ListingCardBadge } from './MarketplaceListingCardFrame';
import { isCoVentureListing } from '../../utils/ventureListingHelpers';

export default function VentureListingTypeBadge({ venture, className = '' }) {
  const isCoVenture = isCoVentureListing(venture);
  return (
    <ListingCardBadge
      variant="glass"
      className={isCoVenture
        ? `bg-teal-50 text-teal-700 border border-teal-200 ${className}`
        : `bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
    >
      {isCoVenture ? 'Co-Venture' : 'Venture'}
    </ListingCardBadge>
  );
}
