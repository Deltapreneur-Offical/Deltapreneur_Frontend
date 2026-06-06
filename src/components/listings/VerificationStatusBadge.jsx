import { useTranslation } from 'react-i18next';
import { ListingCardBadge } from './MarketplaceListingCardFrame';
import {
  getTechnologyVerificationBadgeVariant,
  getTechnologyVerificationLabelKey,
  resolveTechnologyVerificationStatus,
} from '../../utils/listingVerification';

/**
 * Reusable verified / pending / under-review badge for listing cards and detail views.
 */
export default function VerificationStatusBadge({
  item,
  type = 'technology',
  verified,
  className = '',
}) {
  const { t } = useTranslation();

  const verifiedLabel = t('listingCardVerified', 'Verified');
  const pendingLabel = t('listingCardVerificationPending', 'Verification Pending');

  if (type === 'technology') {
    const status = resolveTechnologyVerificationStatus(item);
    const variant = getTechnologyVerificationBadgeVariant(status);
    const labelKey = getTechnologyVerificationLabelKey(status);
    const label = t(labelKey, pendingLabel);
    return (
      <ListingCardBadge variant={variant} className={className}>
        {status === 'verified' ? `✓ ${verifiedLabel}` : label}
      </ListingCardBadge>
    );
  }

  const isVerified = verified ?? Boolean(item?.verified || item?.gstinVerified || item?.gstin_verified);
  if (isVerified) {
    return (
      <ListingCardBadge variant="verified" className={className}>
        ✓ {verifiedLabel}
      </ListingCardBadge>
    );
  }

  return (
    <ListingCardBadge variant="pending" className={className}>
      {pendingLabel}
    </ListingCardBadge>
  );
}
