import { describe, expect, it } from 'vitest';
import { domainRegistrationCartProps, domainToProductId } from './domainRegistrationCart';

describe('domainRegistrationCartProps (showcase routing)', () => {
  it('routes showcase purchases through DOMAIN_REGISTRATION, never DOMAIN_LISTING', () => {
    const props = domainRegistrationCartProps({
      domain: 'batterify.com',
      registrationPriceInr: 330702616.17,
      isPremium: true,
    });
    expect(props.productType).toBe('DOMAIN_REGISTRATION');
    expect(props.productType).not.toBe('DOMAIN_LISTING');
    expect(props.metadata.domainName).toBe('batterify.com');
    expect(props.metadata.isPremium).toBe(true);
    expect(props.metadata.registryTier).toBe('premium');
  });

  it('produces a stable productId for the same FQDN (cart dedupe)', () => {
    const a = domainToProductId('Batterify.com');
    const b = domainToProductId('batterify.com');
    expect(a).toBe(b);
    expect(a).toMatch(/^00000000-0000-4000-8000-/);
  });

  it('keeps a positive 1-year unit price and period=1 for cart line', () => {
    const props = domainRegistrationCartProps({
      domain: 'shinebyte.io',
      registrationPriceInr: 12000,
    });
    expect(props.metadata.price).toBe(12000);
    expect(props.metadata.pricePerYear).toBe(12000);
    expect(props.metadata.period).toBe(1);
    expect(props.metadata.tld).toBe('io');
  });

  it('normalizes the TLD without a leading dot', () => {
    const props = domainRegistrationCartProps({
      domain: 'solara.ai',
      tld: '.ai',
      registrationPriceInr: 25000,
    });
    expect(props.metadata.tld).toBe('ai');
  });

  it('never posts GST-inclusive totals as metadata.price', () => {
    const props = domainRegistrationCartProps({
      domain: 'example.in',
      registrationPriceInr: 575,
      unitPrice: 575,
      totalInr: 678.5,
      payableInr: 678.5,
      price: 678.5,
    });
    expect(props.metadata.price).toBe(575);
    expect(props.metadata.pricePerYear).toBe(575);
  });

  it('ignores GST-only aliases when the ex-GST unit is missing', () => {
    const props = domainRegistrationCartProps({
      domain: 'example.in',
      totalInr: 678.5,
      payableInr: 678.5,
      price: 678.5,
    });
    expect(props.metadata.price).toBe(0);
  });
});
