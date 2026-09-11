import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  getMyPurchasesDomain: vi.fn(),
  listOrders: vi.fn(),
  getMyPurchasesTech: vi.fn(),
  listBuyer: vi.fn(),
  getMyVentures: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (key === 'invoice') return 'Invoice';
      return opts?.defaultValue || key;
    },
  }),
}));

vi.mock('../components/layout/AppLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'buyer@test.local', firstname: 'Test', lastname: 'Buyer' },
  }),
}));

vi.mock('../context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPrice: (amount) => `₹${Number(amount || 0)}`,
  }),
}));

vi.mock('../utils/generateInvoice', () => ({
  generateInvoice: vi.fn(),
}));

vi.mock('../api/services', () => ({
  domainAPI: { getMyPurchases: mocks.getMyPurchasesDomain },
  domainStorefrontAPI: { listOrders: mocks.listOrders },
  technologyAPI: { getMyPurchases: mocks.getMyPurchasesTech },
  domainTransferAPI: { listBuyer: mocks.listBuyer },
  ventureDealAPI: { getMy: mocks.getMyVentures },
}));

import PurchasesPage from './PurchasesPage';
import { generateInvoice } from '../utils/generateInvoice';

const linkInBioPurchase = {
  id: 'sub-lib-1',
  paymentStatus: 'COMPLETED',
  isTechnologyService: true,
  activationStatus: 'ACTIVE',
  selectedPlan: 'starter',
  managePath: '/link-in-bio/manage?service_id=ABC123',
  manageLabel: 'Manage Link in Bio',
  grossAmountInr: 1429,
  amountCharged: 1429,
  subtotalExGst: 1211.02,
  gstAmount: 217.98,
  gstRate: 18,
  software: {
    name: 'Link in Bio',
    category: 'Technology',
    technologyType: 'SOFTWARE',
    price: 1211.02,
  },
  soldAt: '2026-09-10T00:00:00Z',
};

function renderPurchases() {
  return render(
    <MemoryRouter>
      <PurchasesPage />
    </MemoryRouter>,
  );
}

describe('PurchasesPage technology services', () => {
  beforeEach(() => {
    mocks.getMyPurchasesDomain.mockResolvedValue({ data: [] });
    mocks.listOrders.mockResolvedValue({ data: [] });
    mocks.listBuyer.mockResolvedValue({ data: { items: [] } });
    mocks.getMyVentures.mockResolvedValue({ data: [] });
    mocks.getMyPurchasesTech.mockResolvedValue({ data: [linkInBioPurchase] });
    generateInvoice.mockClear();
  });

  it('does not show Manage Link in Bio for an ACTIVE Link in Bio purchase', async () => {
    const user = userEvent.setup();
    renderPurchases();

    expect(await screen.findByText('Link in Bio')).toBeInTheDocument();
    expect(screen.getByText('✓ Active')).toBeInTheDocument();
    expect(screen.queryByText('Manage Link in Bio')).not.toBeInTheDocument();

    await user.click(screen.getByText('Link in Bio'));
    expect(await screen.findByRole('button', { name: 'Invoice' })).toBeInTheDocument();
    expect(screen.queryByText('Manage Link in Bio')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /manage link in bio/i })).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('/link-in-bio/manage');
  });

  it('displays the pre-GST Technology Service amount and keeps GST on the invoice', async () => {
    const user = userEvent.setup();
    renderPurchases();

    expect(await screen.findByText('Link in Bio')).toBeInTheDocument();
    expect(screen.getByText('₹1211.02')).toBeInTheDocument();
    expect(screen.queryByText('₹1429')).not.toBeInTheDocument();

    await user.click(screen.getByText('Link in Bio'));
    const invoiceButton = await screen.findByRole('button', { name: 'Invoice' });
    expect(invoiceButton).toBeInTheDocument();
    await user.click(invoiceButton);

    expect(generateInvoice).toHaveBeenCalledWith({
      type: 'software',
      item: expect.objectContaining({
        subtotalExGst: 1211.02,
        gstAmount: 217.98,
        grossAmountInr: 1429,
        amountCharged: 1429,
      }),
      user: expect.anything(),
    });
  });
});
