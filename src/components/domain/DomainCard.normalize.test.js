import { describe, expect, it } from 'vitest';
import { normalizeDomainCardItem } from './DomainCard';

describe('normalizeDomainCardItem GST display vs cart unit', () => {
  it('shows 678.50 while keeping the 575 ex-GST cart unit', () => {
    const item = normalizeDomainCardItem({
      domain: 'example.in',
      name: 'example',
      tld: 'in',
      status: 'available',
      available: true,
      registrationPrice: 575,
      unitPrice: 575,
      totalInr: 678.5,
      price: 678.5,
      gstEnabled: true,
      renewalPrice: 500,
      renewalTotalInr: 678.5,
    });

    expect(item.registrationPriceInr).toBe(575);
    expect(item.displayPriceInr).toBe(678.5);
    expect(item.gstIncluded).toBe(true);
    expect(item.renewalPriceInr).toBe(500);
    expect(item.renewalDisplayPriceInr).toBe(678.5);
  });

  it('does not treat GST-inclusive price as the cart unit', () => {
    const item = normalizeDomainCardItem({
      domain: 'example.in',
      name: 'example',
      tld: 'in',
      available: true,
      price: 678.5,
      totalInr: 678.5,
      payableInr: 678.5,
    });

    expect(item.registrationPriceInr).toBeNull();
    expect(item.displayPriceInr).toBe(678.5);
  });

  it('hides the GST label when GST is off and totals match the unit', () => {
    const item = normalizeDomainCardItem({
      domain: 'example.in',
      name: 'example',
      tld: 'in',
      available: true,
      registrationPrice: 575,
      totalInr: 575,
      gstEnabled: false,
    });

    expect(item.displayPriceInr).toBe(575);
    expect(item.gstIncluded).toBe(false);
  });

  it('survives a second normalize pass (DomainCardGrid + DomainCard)', () => {
    const first = normalizeDomainCardItem({
      domain: 'example.in',
      name: 'example',
      tld: 'in',
      available: true,
      registrationPrice: 575,
      totalInr: 678.5,
      gstEnabled: true,
      renewalPrice: 500,
      renewalTotalInr: 678.5,
    });
    const second = normalizeDomainCardItem(first);

    expect(second.registrationPriceInr).toBe(575);
    expect(second.displayPriceInr).toBe(678.5);
    expect(second.renewalDisplayPriceInr).toBe(678.5);
    expect(second.gstIncluded).toBe(true);
  });
});
