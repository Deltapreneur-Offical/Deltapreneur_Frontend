import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import VentureListingCard from './VentureListingCard';

vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPrice: (n) => `₹${Number(n).toLocaleString('en-IN')}`,
    currency: 'INR',
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'viewer-1' } }),
}));

const venture = {
  id: 'venture-1',
  listingMode: 'VENTURE',
  listingApprovalStatus: 'APPROVED',
  brandDetails: {
    brandName: 'Sunrise Digital',
    industry: 'Services',
    description: 'A service-oriented digital venture with an acquisition opportunity for a strategic buyer.',
    dealValue: 500000,
  },
  ownershipLiquidationPercent: 25,
  pitchApplicationCount: 3,
  views: 12,
};

const coVenture = {
  ...venture,
  id: 'co-venture-1',
  listingMode: 'CO_VENTURE',
  brandDetails: {
    brandName: 'Green Partners',
    industry: 'Ecommerce',
    dealValue: 500000,
  },
  ownershipLiquidationPercent: 49,
  pitchApplicationCount: 1,
};

function renderVentureCard(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <VentureListingCard
          venture={venture}
          browseMode
          compact
          onView={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('VentureListingCard homepage Ventures layout', () => {
  it('keeps the shared venture card cover and badges by default', () => {
    const { container, getByText } = renderVentureCard();

    expect(container.querySelector('.domain-listing-card__cover')).toBeInTheDocument();
    expect(container.querySelector('.venture-listing-card__badges')).toBeInTheDocument();
    expect(container.querySelector('.venture-listing-card__share-container--inline')).not.toBeInTheDocument();
    expect(getByText('Services')).toBeInTheDocument();
    expect(getByText('Ownership Liquidation')).toBeInTheDocument();
  });

  it('removes the banner and badges only for the homepage Ventures content layout', () => {
    const { container, queryByText } = renderVentureCard({ homepageVentureContentOnly: true });

    expect(container.querySelector('.domain-listing-card__cover')).not.toBeInTheDocument();
    expect(container.querySelector('.venture-listing-card__badges')).not.toBeInTheDocument();
    expect(container.querySelector('.venture-listing-card__share-container--inline')).toBeInTheDocument();
    expect(container.querySelector('.listing-card-stats-footer')).not.toBeInTheDocument();
    expect(queryByText('Services')).not.toBeInTheDocument();
    expect(queryByText('Ownership Liquidation')).not.toBeInTheDocument();
  });

  it('hides offers and uses Offer only for homepage Ventures cards', () => {
    const { getByText, queryByText } = renderVentureCard({ homepageVentureContentOnly: true });

    expect(queryByText('3 Offers')).not.toBeInTheDocument();
    expect(getByText('Offer')).toBeInTheDocument();
    expect(queryByText(/Offer Price/i)).not.toBeInTheDocument();
    expect(queryByText(/Asking Price/i)).not.toBeInTheDocument();
  });

  it('renders the homepage Venture marketplace structure without the shared play icon', () => {
    const { container, getByText } = renderVentureCard({ homepageVentureContentOnly: true });
    const content = container.querySelector('.domain-listing-card__body > div.flex.flex-col:not(.venture-listing-card__footer)');
    const metrics = container.querySelector('.venture-listing-card__metrics');
    const titleRow = container.querySelector('.venture-listing-card__title-row');
    const priceBox = container.querySelector('.domain-listing-card__price-box');

    expect(content).toBeInTheDocument();
    expect(metrics).toBeInTheDocument();
    expect(titleRow).toBeInTheDocument();
    expect([...content.children].indexOf(metrics)).toBeLessThan([...content.children].indexOf(titleRow));
    expect(priceBox).toContainElement(getByText('Offer'));
    expect(priceBox.querySelector('.venture-listing-card__price-arrow-glyph svg')).toBeInTheDocument();
    expect(priceBox.querySelector('.price-section-v-icon')).not.toBeInTheDocument();
  });

  it('keeps offers and Asking Price on non-homepage venture cards', () => {
    const { container, getByText } = renderVentureCard();

    expect(container.querySelector('.listing-card-stats-footer')).toBeInTheDocument();
    expect(getByText('3 Offers')).toBeInTheDocument();
    expect(getByText(/Asking Price/i)).toBeInTheDocument();
  });

  it('uses the simplified homepage layout for Delta Venture cards only when requested', () => {
    const { container, getByText, queryByText } = renderVentureCard({
      venture: coVenture,
      homepageDeltaVentureContentOnly: true,
    });

    expect(container.querySelector('.domain-listing-card__cover')).not.toBeInTheDocument();
    expect(container.querySelector('.venture-listing-card__badges')).not.toBeInTheDocument();
    expect(container.querySelector('.venture-listing-card__share-container--inline')).toBeInTheDocument();
    expect(container.querySelector('.listing-card-stats-footer')).not.toBeInTheDocument();
    expect(queryByText('Ecommerce')).not.toBeInTheDocument();
    expect(queryByText('Investment Seeking')).not.toBeInTheDocument();
    expect(queryByText('1 Applicant')).not.toBeInTheDocument();
    const priceBox = container.querySelector('.domain-listing-card__price-box');
    expect(priceBox).toContainElement(getByText('Apply'));
    expect(queryByText(/Offer Price/i)).not.toBeInTheDocument();
  });
});
