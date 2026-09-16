import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import DomainListingCard from './DomainListingCard';

vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPrice: (n) => `₹${Number(n).toFixed(2)}`,
    currency: 'INR',
  }),
}));

const authMock = vi.hoisted(() => ({
  user: { id: 'owner-1' },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: authMock.user }),
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
  it('hides admin edit/delete controls from non-admin owners', () => {
    authMock.user = { id: 'owner-1' };
    renderOwnerCard({
      browseMode: false,
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onPutForAuction: vi.fn(),
    });
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
    expect(screen.getByTitle('Put Auction')).toBeInTheDocument();
  });

  it('opens the admin edit/delete menu from the pencil button', () => {
    authMock.user = { id: 'admin-1', role: 'ADMIN' };
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderOwnerCard({
      browseMode: false,
      onEdit,
      onDelete,
      onPutForAuction: vi.fn(),
    });

    fireEvent.click(screen.getByTitle('Edit'));

    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items).toHaveLength(2);
    expect(within(menu).getByText('Edit')).toBeInTheDocument();
    expect(within(menu).getByText('Delete')).toBeInTheDocument();

    fireEvent.click(within(menu).getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the admin menu on Escape and outside pointer', () => {
    authMock.user = { id: 'admin-1', role: 'ADMIN' };
    renderOwnerCard({
      browseMode: false,
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onPutForAuction: vi.fn(),
    });

    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows a single Your listing label on homepage browse cards', () => {
    authMock.user = { id: 'owner-1' };
    renderOwnerCard();
    expect(screen.getAllByText('Your listing')).toHaveLength(1);
  });

  it('keeps the auction action when owner handlers exist', () => {
    authMock.user = { id: 'owner-1' };
    renderOwnerCard({
      browseMode: false,
      onEdit: vi.fn(),
      onPutForAuction: vi.fn(),
    });
    expect(screen.queryByText('Your listing')).not.toBeInTheDocument();
    expect(screen.getByTitle('Put Auction')).toBeInTheDocument();
  });
});
