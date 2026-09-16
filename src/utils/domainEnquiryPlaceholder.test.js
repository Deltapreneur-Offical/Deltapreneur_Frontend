import { describe, expect, it } from 'vitest';
import { isDomainEnquiryPlaceholder } from './domainEnquiryPlaceholder';

describe('isDomainEnquiryPlaceholder', () => {
  it('treats virtual and flagged rows as placeholders', () => {
    expect(isDomainEnquiryPlaceholder({ isVirtual: true, fullName: 'Buyer' })).toBe(true);
    expect(isDomainEnquiryPlaceholder({ isPlaceholder: true })).toBe(true);
  });

  it('detects the listing-pipeline copy', () => {
    expect(isDomainEnquiryPlaceholder({
      fullName: 'No buyer enquiry yet',
      message: 'Listed premium domain (Pending buyer enquiry)',
      status: 'PENDING',
    })).toBe(true);
  });

  it('keeps real buyer enquiries', () => {
    expect(isDomainEnquiryPlaceholder({
      fullName: 'Neminath Akkole',
      message: 'Managed domain acquisition request',
      status: 'PENDING',
    })).toBe(false);
  });
});
