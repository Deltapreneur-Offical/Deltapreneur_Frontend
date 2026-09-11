import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  addItem: vi.fn(),
  getMySubscriptions: vi.fn(),
  getServiceBySlug: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mocks.navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, opts) => opts?.defaultValue || _key,
  }),
}));

vi.mock('../components/layout/AppLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../api/technologyServicesApi', () => ({
  technologyServicesAPI: {
    getMySubscriptions: mocks.getMySubscriptions,
    getServiceBySlug: mocks.getServiceBySlug,
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'buyer@test.local',
      firstname: 'Test',
      lastname: 'Buyer',
    },
  }),
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    addItem: mocks.addItem,
  }),
}));

vi.mock('../context/CurrencyContext', () => ({
  useCurrency: () => ({
    convertToInr: (amount, currency) => (
      String(currency).toUpperCase() === 'USD' ? Number(amount) * 80 : Number(amount)
    ),
    formatPrice: (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`,
  }),
}));

function serviceFixture(slug, name) {
  return {
    id: `svc-${slug}`,
    slug,
    name,
    category: 'Business',
    badge: 'Featured',
    icon: 'Layout',
    short_description: `${name} short description`,
    long_description: `${name} long description`,
    starting_price: 15,
    provider_product_key: `provider-${slug}`,
    features: [`${name} feature`],
    plans: [
      {
        code: 'starter',
        name: 'Starter',
        price_monthly: 15,
        price_annually: 150,
        features: ['Starter feature'],
      },
    ],
    faqs: [{ question: `${name} question`, answer: `${name} answer` }],
  };
}

function renderDetail(slug) {
  return render(
    <MemoryRouter initialEntries={[`/technologies/${slug}`]}>
      <Routes>
        <Route path="/technologies/:slug" element={<TechnologyServiceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderExactServiceRoute(slug) {
  return render(
    <MemoryRouter initialEntries={[`/technologies/${slug}`]}>
      <Routes>
        <Route path={`/technologies/${slug}`} element={<TechnologyServiceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderWithoutSlug(path = '/cart') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<TechnologyServiceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

import TechnologyServiceDetailPage from './TechnologyServiceDetailPage';

describe('TechnologyServiceDetailPage', () => {
  beforeEach(() => {
    mocks.addItem.mockReset();
    mocks.getMySubscriptions.mockReset();
    mocks.getServiceBySlug.mockReset();
    mocks.navigate.mockReset();
    mocks.getMySubscriptions.mockResolvedValue({ data: [] });
  });

  it.each([
    ['website-builder', 'Website Builder'],
    ['ai-business-suite', 'AI Business Suite'],
    ['crm', 'CRM'],
    ['invoice-ai', 'Invoice AI'],
  ])('loads %s without ReferenceError', async (slug, name) => {
    mocks.getServiceBySlug.mockResolvedValueOnce({ data: serviceFixture(slug, name) });

    renderDetail(slug);

    expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getByText(`${name} long description`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select starter plan/i })).toBeInTheDocument();
    expect(mocks.getServiceBySlug).toHaveBeenCalledWith(slug);
  });

  it('loads a technology service from an exact app route without a route param', async () => {
    mocks.getServiceBySlug.mockResolvedValueOnce({
      data: serviceFixture('ai-business-suite', 'AI Business Suite'),
    });

    renderExactServiceRoute('ai-business-suite');

    expect(await screen.findByRole('heading', { name: 'AI Business Suite' })).toBeInTheDocument();
    expect(mocks.getServiceBySlug).toHaveBeenCalledWith('ai-business-suite');
  });

  it('hands the selected Website Builder plan to cart checkout', async () => {
    const user = userEvent.setup();
    mocks.getServiceBySlug.mockResolvedValueOnce({
      data: serviceFixture('website-builder', 'Website Builder'),
    });
    mocks.addItem.mockResolvedValueOnce({ item: { id: 'cart-item-1' } });

    renderDetail('website-builder');

    await user.click(await screen.findByRole('button', { name: /select starter plan/i }));
    await user.click(screen.getByRole('button', { name: /confirm & pay/i }));

    await waitFor(() => {
      expect(mocks.addItem).toHaveBeenCalledWith(
        'TECHNOLOGY',
        'svc-website-builder',
        expect.objectContaining({
          selectedPlan: 'starter',
          coBrotherOptIn: false,
          metadata: expect.objectContaining({
            productName: 'Website Builder',
            serviceSlug: 'website-builder',
            billingCycle: 'monthly',
            planCode: 'starter',
            providerProductKey: 'provider-website-builder',
          }),
        }),
      );
    });
    expect(mocks.navigate).toHaveBeenCalledWith('/cart');
  });

  it('shows the service error fallback without throwing when the API fails', async () => {
    mocks.getServiceBySlug.mockRejectedValueOnce(new Error('network failed'));

    renderDetail('website-builder');

    expect(await screen.findByText('Technology service not found.')).toBeInTheDocument();
  });

  it('does not treat the cart route as a technology service slug', async () => {
    renderWithoutSlug('/cart');

    expect(await screen.findByText('Technology service identifier is missing.')).toBeInTheDocument();
    expect(mocks.getServiceBySlug).not.toHaveBeenCalled();
  });
});
