import { describe, expect, it } from 'vitest';
import {
  getTechnologyVerificationBadgeVariant,
  getTechnologyVerificationLabelKey,
  resolveTechnologyVerificationStatus,
  resolveVentureApprovalStatus,
  resolveVentureGstinStatus,
} from './listingVerification';

describe('listingVerification', () => {
  it('maps technology verification states', () => {
    const status = resolveTechnologyVerificationStatus({ verified: true });
    expect(status).toBe('verified');
    expect(getTechnologyVerificationBadgeVariant(status)).toBe('verified');
    expect(getTechnologyVerificationLabelKey(status)).toBe('listingCardVerified');
  });

  it('maps venture and GSTIN verification states', () => {
    expect(resolveVentureGstinStatus({ gstin_verified: true })).toBe('verified');
    expect(resolveVentureApprovalStatus({ listing_approval_status: 'APPROVED' })).toBe('approved');
  });
});
