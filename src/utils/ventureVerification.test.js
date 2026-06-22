import { describe, expect, it } from 'vitest';
import {
  canOpenVentureVerification,
  countVenturesPendingVerification,
  filterVenturesForSection,
  ventureVerificationStatusLabel,
} from './ventureVerification';

describe('ventureVerification', () => {
  it('filters ventures by section', () => {
    const ventures = [
      { listingMode: 'VENTURE' },
      { listingMode: 'CO_VENTURE' },
    ];

    expect(filterVenturesForSection(ventures, 'venture')).toHaveLength(1);
    expect(filterVenturesForSection(ventures, 'coventure')).toHaveLength(1);
  });

  it('counts pending verification requests', () => {
    const ventures = [
      { verificationRequested: true, verificationStatus: 'PENDING' },
      { verificationRequested: true, verificationStatus: 'APPROVED' },
    ];
    expect(countVenturesPendingVerification(ventures)).toBe(1);
  });

  it('labels verification states', () => {
    expect(ventureVerificationStatusLabel({ verificationStatus: 'APPROVED' })).toBe('Verified');
    expect(canOpenVentureVerification({ verificationStatus: 'APPROVED' })).toBe(false);
  });
});
