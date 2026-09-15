import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import DomainListingCard from './DomainListingCard';

vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPrice: (n) => `₹${Number(n).toFixed(2)}`,
    currency: 'INR',
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1' } }),
}));

vi.mock('../cart/AddToCartButton', () => ({
  default: () => <button type="button">Add to Cart</button>,
}));

const ownerListing = {
  id: 'listing-1',
  name: 'example',
  extension: '.in',
  domainName: 'example.in',
  askingPrice: 10000,
  listingPrice: 10000,
  domainStatus: 'AVAILABLE',
  verified: true,
};

function renderOwnerCard(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <DomainListingCard
        domain={ownerListing}
        browseMode
        marketplace
        isOwner
        {...props}
      />
    </I18nextProvider>,
  );
}

describe('DomainListingCard marketplace owner footer', () => {
  it('shows a single Your listing label on homepage browse cards', () => {
    renderOwnerCard();
    expect(screen.getAllByText('Your listing')).toHaveLength(1);
  });

  it('keeps edit plus auction actions when those handlers exist', () => {
    renderOwnerCard({
      browseMode: false,
      onEdit: vi.fn(),
      onPutForAuction: vi.fn(),
    });
    expect(screen.queryByText('Your listing')).not.toBeInTheDocument();
    expect(screen.getByTitle('Put Auction')).toBeInTheDocument();
  });
});
