import { describe, expect, it } from 'vitest';
import {
  buildShowcaseLookupPayload,
  showcaseLookupCardModel,
  showcaseLookupTickDisabled,
} from './showcaseAdminLookup';

describe('buildShowcaseLookupPayload', () => {
  it('sends only the exact domain name and TLD', () => {
    expect(buildShowcaseLookupPayload('Example', '.COM')).toEqual({
      domain_name: 'example',
      tld: 'com',
    });
  });

  it('rejects a FQDN pasted into the name field', () => {
    expect(buildShowcaseLookupPayload('example.com', 'com').error).toMatch(/without the extension/i);
  });

  it('rejects missing name or TLD', () => {
    expect(buildShowcaseLookupPayload('', 'com').error).toBeTruthy();
    expect(buildShowcaseLookupPayload('example', '').error).toBeTruthy();
  });
});

describe('showcaseLookupTickDisabled', () => {
  it('allows Tick only when the existing select id is present', () => {
    expect(
      showcaseLookupTickDisabled({
        canSelect: true,
        item: { id: 'row-1' },
      }),
    ).toBeNull();
  });

  it('disables Tick for unavailable, non-premium, and missing id', () => {
    expect(
      showcaseLookupTickDisabled({
        canSelect: false,
        reason: 'taken',
        message: 'This domain is not available for registration.',
        item: null,
      }),
    ).toMatch(/not available/i);
    expect(
      showcaseLookupTickDisabled({
        canSelect: false,
        reason: 'not_premium',
        message: 'OpenProvider did not return this as a premium Showcase domain.',
        item: null,
      }),
    ).toMatch(/premium/i);
    expect(showcaseLookupTickDisabled({ canSelect: true, item: null })).toBeTruthy();
  });
});

describe('showcaseLookupCardModel', () => {
  it('displays live OpenProvider fields rather than a stale snapshot', () => {
    const card = showcaseLookupCardModel({
      canSelect: true,
      item: { id: 'abc', createPriceInr: 1000, isSelected: false },
      live: {
        domainName: 'shinebyte.com',
        tld: 'com',
        available: true,
        isPremium: true,
        source: 'registry',
        createPriceInr: 55555,
        renewalPriceInr: 40000,
        payableInr: 65555,
      },
    });
    expect(card).toMatchObject({
      id: 'abc',
      domainName: 'shinebyte.com',
      createPriceInr: 55555,
      canSelect: true,
    });
    expect(card.createPriceInr).not.toBe(1000);
  });
});
