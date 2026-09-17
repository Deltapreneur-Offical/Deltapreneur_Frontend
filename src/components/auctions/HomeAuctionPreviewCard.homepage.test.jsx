import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import HomeAuctionPreviewCard from './HomeAuctionPreviewCard';

vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatPrice: (n) => `Rs ${Number(n).toLocaleString('en-IN')}`,
    currency: 'INR',
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'viewer-1' } }),
}));

vi.mock('../home/carouselCloneContext', () => ({
  useIsCarouselClone: () => false,
}));

vi.mock('./CreatorPreviewModal', () => ({
  default: () => null,
}));

const auction = {
  id: 'auction-1',
  category: 'domain',
  featured: true,
  minBidPrice: 20000,
  currentHighestBid: 0,
  totalBids: 0,
  endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  listedBy: { name: 'Delta preneur' },
  domain: {
    id: 'domain-1',
    fullDomain: 'drygrains.com',
    domainName: 'drygrains',
    domainExtension: '.com',
    pricingDemand: 'PREMIUM',
    description: 'Premium agriculture domain',
  },
};

function renderCard(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <HomeAuctionPreviewCard auction={auction} onView={vi.fn()} {...props} />
    </I18nextProvider>,
  );
}

describe('HomeAuctionPreviewCard homepage layout', () => {
  it('keeps the auction cover and cover share control by default', () => {
    const { container, getByText } = renderCard();

    expect(container.querySelector('.domain-listing-card__cover')).toBeInTheDocument();
    expect(container.querySelector('.home-auction-preview-card__share-container--inline')).not.toBeInTheDocument();
    expect(getByText('Featured')).toBeInTheDocument();
    expect(getByText(/Listed by/i)).toBeInTheDocument();
  });

  it('removes the cover and moves featured/share into the card for homepage auctions only', () => {
    const { container, getByText, queryByText } = renderCard({ homepageAuctionContentOnly: true });

    expect(container.querySelector('.domain-listing-card__cover')).not.toBeInTheDocument();
    expect(container.querySelector('.home-auction-preview-card--homepage-content')).toBeInTheDocument();
    expect(container.querySelector('.home-auction-preview-card__share-container--inline')).toBeInTheDocument();
    expect(container.querySelector('.home-auction-preview-card__featured-badge--inline')).toBeInTheDocument();
    expect(getByText('Featured')).toBeInTheDocument();
    expect(getByText(/Starting Bid/i)).toBeInTheDocument();
    expect(getByText(/Current Bid/i)).toBeInTheDocument();
    expect(queryByText(/Listed by/i)).not.toBeInTheDocument();
  });
});
