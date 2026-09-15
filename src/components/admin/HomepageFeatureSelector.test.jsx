import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomepageFeatureSelector from './HomepageFeatureSelector';
import { HOMEPAGE_FEATURE_MAX_MESSAGE } from '../../utils/homepageFeatureLimit';

const mocks = vi.hoisted(() => ({
  getDomains: vi.fn(),
  getVentures: vi.fn(),
  getSoftwares: vi.fn(),
  getCommunities: vi.fn(),
  getVirtualAssistantsForHomepage: vi.fn(),
  getAllAuctions: vi.fn(),
  getAllCommunityAuctions: vi.fn(),
  getAllSoftwareAuctions: vi.fn(),
  toggleFeatured: vi.fn(),
}));

vi.mock('../../api/services', () => ({
  adminAPI: {
    getDomains: mocks.getDomains,
    getVentures: mocks.getVentures,
    getSoftwares: mocks.getSoftwares,
    getCommunities: mocks.getCommunities,
    getVirtualAssistantsForHomepage: mocks.getVirtualAssistantsForHomepage,
    getAllAuctions: mocks.getAllAuctions,
    getAllCommunityAuctions: mocks.getAllCommunityAuctions,
    getAllSoftwareAuctions: mocks.getAllSoftwareAuctions,
    toggleFeatured: mocks.toggleFeatured,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => {
      if (opts.defaultValue) {
        return String(opts.defaultValue).replace(/\{\{(\w+)\}\}/g, (_, name) => (
          opts[name] == null ? '' : String(opts[name])
        ));
      }
      if (key === 'homepageFeatureCount') return `${opts.count} featured`;
      if (key === 'homepageFeatureSwitchAdd') return 'Feature';
      if (key === 'homepageFeatureSwitchRemove') return 'Unfeature';
      if (key === 'homepageFeatureSwitchFeature') return 'Feature';
      if (key === 'homepageFeatureSwitchFeatured') return 'Featured';
      return key;
    },
  }),
  Trans: ({ children }) => children,
}));

function domain(id, featured) {
  return {
    id,
    domainName: `domain${id}`,
    domainExtension: '.com',
    featured,
    status: true,
    verified: true,
  };
}

function venture(id, featured) {
  return {
    id,
    listingMode: 'VENTURE',
    listingApprovalStatus: 'APPROVED',
    featured,
    status: true,
    brandDetails: { brandName: `Venture ${id}` },
  };
}

async function renderSelector(type, toast) {
  const view = render(<HomepageFeatureSelector type={type} toast={toast} />);
  await screen.findByRole('list');
  return view;
}

describe('HomepageFeatureSelector max 8 featured', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.toggleFeatured.mockImplementation((_type, _id, featured) => (
      Promise.resolve({ data: { featured } })
    ));
  });

  it('features an 8th domain when 7 are already featured', async () => {
    const toast = { error: vi.fn() };
    mocks.getDomains.mockResolvedValue({
      data: [
        ...Array.from({ length: 7 }, (_, i) => domain(i + 1, true)),
        domain(8, false),
      ],
    });

    await renderSelector('domain', toast);
    const user = userEvent.setup();
    const offSwitch = screen.getByRole('switch', { name: 'Feature' });
    await user.click(offSwitch);

    await waitFor(() => {
      expect(mocks.toggleFeatured).toHaveBeenCalledTimes(1);
    });
    expect(mocks.toggleFeatured).toHaveBeenCalledWith('DOMAIN', 8, true);
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getAllByRole('switch', { name: 'Unfeature' })).toHaveLength(8);
  });

  it('blocks a 9th domain and keeps the existing 8 featured', async () => {
    const toast = { error: vi.fn() };
    mocks.getDomains.mockResolvedValue({
      data: [
        ...Array.from({ length: 8 }, (_, i) => domain(i + 1, true)),
        domain(9, false),
      ],
    });

    await renderSelector('domain', toast);
    const user = userEvent.setup();
    const offSwitch = screen.getByRole('switch', { name: 'Feature' });
    await user.click(offSwitch);

    expect(toast.error).toHaveBeenCalledWith(HOMEPAGE_FEATURE_MAX_MESSAGE);
    expect(mocks.toggleFeatured).not.toHaveBeenCalled();
    expect(offSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByRole('switch', { name: 'Unfeature' })).toHaveLength(8);
  });

  it('rolls back and shows the warning when the API rejects a 9th feature', async () => {
    const toast = { error: vi.fn() };
    mocks.getDomains.mockResolvedValue({
      data: [
        ...Array.from({ length: 7 }, (_, i) => domain(i + 1, true)),
        domain(8, false),
      ],
    });
    mocks.toggleFeatured.mockRejectedValue({
      response: {
        status: 400,
        data: { success: false, error: HOMEPAGE_FEATURE_MAX_MESSAGE, featured: false },
      },
    });

    await renderSelector('domain', toast);
    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: 'Feature' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(HOMEPAGE_FEATURE_MAX_MESSAGE);
    });
    expect(screen.getByRole('switch', { name: 'Feature' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByRole('switch', { name: 'Unfeature' })).toHaveLength(7);
  });

  it('allows featuring again after unfeaturing one of eight', async () => {
    const toast = { error: vi.fn() };
    mocks.getDomains.mockResolvedValue({
      data: [
        ...Array.from({ length: 8 }, (_, i) => domain(i + 1, true)),
        domain(9, false),
      ],
    });

    await renderSelector('domain', toast);
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('switch', { name: 'Unfeature' })[0]);
    await waitFor(() => {
      expect(mocks.toggleFeatured).toHaveBeenCalledWith('DOMAIN', 1, false);
    });

    const ninthRow = screen.getByText('domain9.com').closest('li');
    await user.click(within(ninthRow).getByRole('switch', { name: 'Feature' }));
    await waitFor(() => {
      expect(mocks.toggleFeatured).toHaveBeenCalledWith('DOMAIN', 9, true);
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not let a full Domains section block Ventures from featuring its own 8th item', async () => {
    const toast = { error: vi.fn() };
    mocks.getDomains.mockResolvedValue({
      data: Array.from({ length: 8 }, (_, i) => domain(i + 1, true)),
    });
    mocks.getVentures.mockResolvedValue({
      data: [
        ...Array.from({ length: 7 }, (_, i) => venture(i + 1, true)),
        venture(8, false),
      ],
    });

    const { container } = render(
      <>
        <HomepageFeatureSelector type="domain" toast={toast} />
        <HomepageFeatureSelector type="venture" toast={toast} />
      </>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole('list')).toHaveLength(2);
    });

    const lists = screen.getAllByRole('list');
    const ventureList = lists[1];
    const user = userEvent.setup();
    await user.click(within(ventureList).getByRole('switch', { name: 'Feature' }));

    await waitFor(() => {
      expect(mocks.toggleFeatured).toHaveBeenCalledWith('VENTURE', 8, true);
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(container).toBeTruthy();
  });

  it.each([
    ['software', 'getSoftwares', {
      id: 0,
      name: 'Soft',
      featured: false,
      status: true,
      verified: true,
    }],
    ['community', 'getCommunities', {
      id: 0,
      name: 'Creator',
      featured: false,
      status: 'ACTIVE',
      profileComplete: true,
      isApproved: true,
    }],
    ['virtual-assistant', 'getVirtualAssistantsForHomepage', {
      id: 0,
      fullName: 'Operator',
      featured: false,
      publishStatus: 'published',
      overallStatus: 'approved',
      publicMonthlyPriceInr: 1000,
    }],
    ['coventure', 'getVentures', {
      id: 0,
      listingMode: 'CO_VENTURE',
      listingApprovalStatus: 'APPROVED',
      featured: false,
      status: true,
      brandDetails: { brandName: 'CoVenture' },
    }],
  ])('blocks a 9th %s feature independently', async (type, apiMethod, base) => {
    const toast = { error: vi.fn() };
    mocks[apiMethod].mockResolvedValue({
      data: [
        ...Array.from({ length: 8 }, (_, i) => ({ ...base, id: i + 1, featured: true, name: `${base.name || 'Item'} ${i + 1}`, fullName: `${base.fullName || 'Item'} ${i + 1}`, brandDetails: { brandName: `${type} ${i + 1}` } })),
        { ...base, id: 9, featured: false },
      ],
    });

    await renderSelector(type, toast);
    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: 'Feature' }));

    expect(toast.error).toHaveBeenCalledWith(HOMEPAGE_FEATURE_MAX_MESSAGE);
    expect(mocks.toggleFeatured).not.toHaveBeenCalled();
    expect(screen.getAllByRole('switch', { name: 'Unfeature' })).toHaveLength(8);
  });

  it('blocks a 9th auction feature', async () => {
    const toast = { error: vi.fn() };
    mocks.getAllAuctions.mockResolvedValue({
      data: [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          status: 'ACTIVE',
          featured: true,
          endTime: '2026-06-30T00:00:00Z',
          domain: { fullDomain: `featured${i}.com` },
        })),
        {
          id: 9,
          status: 'ACTIVE',
          featured: false,
          endTime: '2026-06-30T00:00:00Z',
          domain: { fullDomain: 'ninth.com' },
        },
      ],
    });
    mocks.getAllCommunityAuctions.mockResolvedValue({ data: [] });
    mocks.getAllSoftwareAuctions.mockResolvedValue({ data: [] });

    await renderSelector('auction', toast);
    const user = userEvent.setup();
    await user.click(screen.getByRole('switch', { name: 'Feature' }));

    expect(toast.error).toHaveBeenCalledWith(HOMEPAGE_FEATURE_MAX_MESSAGE);
    expect(mocks.toggleFeatured).not.toHaveBeenCalled();
    expect(screen.getAllByRole('switch', { name: 'Unfeature' })).toHaveLength(8);
  });

  it('ignores rapid clicks so a 9th feature request is not sent', async () => {
    const toast = { error: vi.fn() };
    let release;
    mocks.toggleFeatured.mockImplementation(() => new Promise((resolve) => {
      release = () => resolve({ data: { featured: true } });
    }));
    mocks.getDomains.mockResolvedValue({
      data: [
        ...Array.from({ length: 7 }, (_, i) => domain(i + 1, true)),
        domain(8, false),
        domain(9, false),
      ],
    });

    await renderSelector('domain', toast);
    const offSwitches = screen.getAllByRole('switch', { name: 'Feature' });
    offSwitches[0].click();
    offSwitches[1].click();

    expect(toast.error).toHaveBeenCalledWith(HOMEPAGE_FEATURE_MAX_MESSAGE);
    expect(mocks.toggleFeatured).toHaveBeenCalledTimes(1);
    expect(mocks.toggleFeatured).toHaveBeenCalledWith('DOMAIN', 8, true);
    expect(offSwitches[1]).toHaveAttribute('aria-checked', 'false');
    release();
    await waitFor(() => {
      expect(screen.getAllByRole('switch', { name: 'Unfeature' })).toHaveLength(8);
    });
  });
});
