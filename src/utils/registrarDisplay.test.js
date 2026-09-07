import { describe, expect, it } from 'vitest';
import {
  displayNameserverHost,
  formatNameserversForDisplay,
  isPlatformNameserverSet,
  resolveNameserverForSubmit,
} from './registrarDisplay';

const DELTAPRENEUR_NS = [
  'ns1.deltapreneur.com',
  'ns2.deltapreneur.com',
  'ns3.deltapreneur.com',
];
const HUBREGISTRAR_NS = [
  'ns1.hubregistrar.com',
  'ns2.hubregistrar.com',
  'ns3.hubregistrar.com',
];
const COBROTHER_NS = [
  'ns1.cobrother.com',
  'ns2.cobrother.com',
  'ns3.cobrother.com',
];
const LEGACY_OP_NS = [
  'ns1.openprovider.nl',
  'ns2.openprovider.be',
  'ns3.openprovider.eu',
];

describe('registrarDisplay — Deltapreneur nameservers', () => {
  it('recognizes Deltapreneur hosts as platform nameservers', () => {
    expect(isPlatformNameserverSet(DELTAPRENEUR_NS)).toBe(true);
  });

  it('labels Deltapreneur hosts with the friendly DNS names', () => {
    expect(DELTAPRENEUR_NS.map((h, i) => displayNameserverHost(h, i))).toEqual([
      'Deltapreneur DNS 1',
      'Deltapreneur DNS 2',
      'Deltapreneur DNS 3',
    ]);
  });

  it('normalizes case and trailing dots', () => {
    expect(isPlatformNameserverSet(['NS1.Deltapreneur.COM'])).toBe(true);
    expect(displayNameserverHost(' NS2.DELTAPRENEUR.COM ', 1)).toBe('Deltapreneur DNS 2');
  });

  it('summarizes a Deltapreneur set as managed DNS', () => {
    expect(formatNameserversForDisplay(DELTAPRENEUR_NS)).toBe('Deltapreneur managed DNS');
  });

  it('maps Deltapreneur aliases back to real hosts when there is no original host', () => {
    expect(resolveNameserverForSubmit('Deltapreneur DNS 1', 0, [])).toBe('ns1.deltapreneur.com');
    expect(resolveNameserverForSubmit('deltapreneur dns 2', 1, [])).toBe('ns2.deltapreneur.com');
    expect(resolveNameserverForSubmit('Deltapreneur DNS 3', 2, [])).toBe('ns3.deltapreneur.com');
  });
});

describe('registrarDisplay — legacy hosts stay recognized', () => {
  it.each([
    ['HubRegistrar', HUBREGISTRAR_NS],
    ['CoBrother', COBROTHER_NS],
    ['legacy OpenProvider', LEGACY_OP_NS],
  ])('treats %s hosts as platform nameservers', (_label, hosts) => {
    expect(isPlatformNameserverSet(hosts)).toBe(true);
    expect(formatNameserversForDisplay(hosts)).toBe('Deltapreneur managed DNS');
  });

  it('still labels legacy hosts without leaking vendor brands', () => {
    expect(displayNameserverHost('ns1.hubregistrar.com', 0)).toBe('Deltapreneur DNS 1');
    expect(displayNameserverHost('ns1.cobrother.com', 0)).toBe('Deltapreneur DNS 1');
    expect(displayNameserverHost('ns1.openprovider.nl', 0)).toBe('Deltapreneur DNS 1');
  });

  it('does not force-migrate an existing order to Deltapreneur hosts', () => {
    expect(
      resolveNameserverForSubmit('Deltapreneur DNS 1', 0, HUBREGISTRAR_NS),
    ).toBe('ns1.hubregistrar.com');
    expect(
      resolveNameserverForSubmit('Deltapreneur DNS 2', 1, COBROTHER_NS),
    ).toBe('ns2.cobrother.com');
    expect(
      resolveNameserverForSubmit('Deltapreneur DNS 1', 0, LEGACY_OP_NS),
    ).toBe('ns1.openprovider.nl');
  });

  it('keeps a Deltapreneur order on its own hosts', () => {
    expect(
      resolveNameserverForSubmit('Deltapreneur DNS 1', 0, DELTAPRENEUR_NS),
    ).toBe('ns1.deltapreneur.com');
  });
});

describe('registrarDisplay — external hosts', () => {
  it('rejects external nameservers', () => {
    expect(isPlatformNameserverSet(['ns1.godaddy.com', 'ns2.godaddy.com'])).toBe(false);
    expect(isPlatformNameserverSet([...DELTAPRENEUR_NS, 'ns1.godaddy.com'])).toBe(false);
  });

  it('passes a typed custom host through unchanged', () => {
    expect(resolveNameserverForSubmit('ns1.godaddy.com', 0, DELTAPRENEUR_NS)).toBe('ns1.godaddy.com');
  });

  it('lists external hosts verbatim instead of claiming managed DNS', () => {
    expect(formatNameserversForDisplay(['ns1.godaddy.com'])).toBe('ns1.godaddy.com');
  });
});
