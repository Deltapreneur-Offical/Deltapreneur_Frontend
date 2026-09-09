import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShowcaseAdminTab from './ShowcaseAdminTab';

const mocks = vi.hoisted(() => ({
  getShowcaseDomains: vi.fn(),
  lookupShowcaseDomain: vi.fn(),
  selectShowcaseDomain: vi.fn(),
  unselectShowcaseDomain: vi.fn(),
  removeShowcaseDomain: vi.fn(),
  refreshShowcase: vi.fn(),
  updateShowcaseConfig: vi.fn(),
  generateShowcaseCandidates: vi.fn(),
  getShowcaseStatus: vi.fn(),
  cancelShowcaseGeneration: vi.fn(),
}));

vi.mock('../../api/services', () => ({
  adminAPI: {
    getShowcaseDomains: mocks.getShowcaseDomains,
    lookupShowcaseDomain: mocks.lookupShowcaseDomain,
    selectShowcaseDomain: mocks.selectShowcaseDomain,
    unselectShowcaseDomain: mocks.unselectShowcaseDomain,
    removeShowcaseDomain: mocks.removeShowcaseDomain,
    refreshShowcase: mocks.refreshShowcase,
    updateShowcaseConfig: mocks.updateShowcaseConfig,
  },
}));

vi.mock('../../context/CurrencyContext', () => ({
  __esModule: true,
  default: () => ({ formatPrice: (n) => `₹${n}` }),
  useCurrency: () => ({ formatPrice: (n) => `₹${n}` }),
}));

const emptyList = {
  data: {
    items: [],
    total: 0,
    config: {
      enabled: false,
      seed_labels: [],
      allowed_tlds: [],
      max_selected: 50,
      refresh_interval_hours: 6,
    },
    readOnly: false,
  },
};

describe('ShowcaseAdminTab exact-domain search', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.getShowcaseDomains.mockResolvedValue(emptyList);
  });

  it('searches only the exact domain + TLD and does not call generate/status/cancel', async () => {
    const user = userEvent.setup();
    mocks.lookupShowcaseDomain.mockResolvedValue({
      data: {
        eligible: true,
        canSelect: true,
        live: {
          domainName: 'shinebyte.com',
          tld: 'com',
          available: true,
          isPremium: true,
          source: 'registry',
          createPriceInr: 55555,
        },
        item: { id: 'row-1', isSelected: false, domainName: 'shinebyte.com' },
      },
    });

    render(<ShowcaseAdminTab />);
    await screen.findByText('Search premium domain');

    await user.type(screen.getByPlaceholderText('example'), 'shinebyte');
    const tld = screen.getByPlaceholderText('.com');
    await user.clear(tld);
    await user.type(tld, 'com');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(mocks.lookupShowcaseDomain).toHaveBeenCalledTimes(1);
    expect(mocks.lookupShowcaseDomain).toHaveBeenCalledWith({
      domain_name: 'shinebyte',
      tld: 'com',
    });
    expect(mocks.generateShowcaseCandidates).not.toHaveBeenCalled();
    expect(mocks.getShowcaseStatus).not.toHaveBeenCalled();
    expect(mocks.cancelShowcaseGeneration).not.toHaveBeenCalled();
  });

  it('shows one live result card and Ticks via the existing select endpoint', async () => {
    const user = userEvent.setup();
    mocks.lookupShowcaseDomain.mockResolvedValue({
      data: {
        eligible: true,
        canSelect: true,
        live: {
          domainName: 'shinebyte.com',
          tld: 'com',
          available: true,
          isPremium: true,
          source: 'registry',
          createPriceInr: 55555,
        },
        item: { id: 'row-1', isSelected: false, domainName: 'shinebyte.com' },
      },
    });
    mocks.selectShowcaseDomain.mockResolvedValue({ data: { success: true } });

    render(<ShowcaseAdminTab />);
    await screen.findByText('Search premium domain');
    await user.type(screen.getByPlaceholderText('example'), 'shinebyte');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('shinebyte.com')).toBeTruthy();
    expect(screen.getByText(/₹55555/)).toBeTruthy();
    expect(screen.getAllByText('shinebyte.com')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Tick' }));
    expect(mocks.selectShowcaseDomain).toHaveBeenCalledWith('row-1');
  });

  it('disables Tick for unavailable and non-premium live results', async () => {
    const user = userEvent.setup();
    mocks.lookupShowcaseDomain.mockResolvedValue({
      data: {
        eligible: false,
        canSelect: false,
        reason: 'not_premium',
        message: 'OpenProvider did not return this as a premium Showcase domain.',
        live: {
          domainName: 'example.com',
          tld: 'com',
          available: true,
          isPremium: false,
          source: 'registry',
          createPriceInr: 800,
        },
        item: null,
      },
    });

    render(<ShowcaseAdminTab />);
    await screen.findByText('Search premium domain');
    await user.type(screen.getByPlaceholderText('example'), 'example');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    const tick = await screen.findByRole('button', { name: 'Tick' });
    expect(tick).toBeDisabled();
    expect(mocks.selectShowcaseDomain).not.toHaveBeenCalled();
  });

  it('still loads Live list and Settings', async () => {
    render(<ShowcaseAdminTab />);
    expect(await screen.findByText(/Live on Marketplace \(/)).toBeTruthy();
    expect(await screen.findByText('Advanced settings')).toBeTruthy();
    expect(screen.getByText('Show on Marketplace')).toBeTruthy();
    expect(mocks.getShowcaseDomains).toHaveBeenCalled();
  });
});
