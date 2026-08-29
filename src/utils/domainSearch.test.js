import { describe, expect, it } from 'vitest';
import {
  normalizeDomainExtension,
  normalizeDomainLabel,
  normalizeSearchFqdn,
} from './domainSearch';

describe('normalizeDomainLabel', () => {
  it('drops spaces and punctuation so a phrase becomes a DNS label', () => {
    expect(normalizeDomainLabel('a coffee shop near collage')).toBe('acoffeeshopnearcollage');
    expect(normalizeDomainLabel("  A Coffee-Shop, near collage!  ")).toBe('acoffee-shopnearcollage');
    expect(normalizeDomainLabel("o'reilly & tea")).toBe('oreillytea');
  });

  it('keeps only the SLD when a TLD is present', () => {
    expect(normalizeDomainLabel('a coffee shop.com')).toBe('acoffeeshop');
    expect(normalizeDomainExtension('a coffee shop.com')).toBe('com');
    expect(normalizeSearchFqdn('a coffee shop near collage')).toBe('acoffeeshopnearcollage.com');
    expect(normalizeSearchFqdn('my shop.co.uk')).toBe('myshop.co.uk');
  });

  it('rejects empty or hyphen-only input', () => {
    expect(normalizeDomainLabel('')).toBe('');
    expect(normalizeDomainLabel('!!! ???')).toBe('');
    expect(normalizeDomainLabel('---')).toBe('');
    expect(normalizeSearchFqdn('***')).toBe('');
  });

  it('caps length and strips leading or trailing hyphens', () => {
    expect(normalizeDomainLabel('a'.repeat(80))).toHaveLength(63);
    expect(normalizeDomainLabel('-hello-world-')).toBe('hello-world');
  });
});
