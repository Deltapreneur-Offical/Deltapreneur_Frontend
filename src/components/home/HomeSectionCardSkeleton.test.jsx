import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';

function renderSkeleton(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <HomeSectionCardSkeleton
          title="Auctions"
          to="/auctions"
          accent="auction"
          variant="auction"
          {...props}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('HomeSectionCardSkeleton auction', () => {
  it('uses the same card row as loaded auctions, not a shrinking flex strip', () => {
    const { container } = renderSkeleton();

    expect(container.querySelector('.home-auctions-section')).not.toBeNull();
    expect(container.querySelector('.home-cards-nav-wrap--auction')).not.toBeNull();
    expect(container.querySelector('.home-preview-row.home-cards-nav-row')).not.toBeNull();
    expect(container.querySelectorAll('.home-preview-card-skeleton--auction')).toHaveLength(4);
    expect(container.querySelectorAll('.home-auction-preview-card--homepage-content')).toHaveLength(4);
  });

  it('does not mount placeholder cards in reserve-only mode', () => {
    const { container } = renderSkeleton({ reserveOnly: true });

    expect(container.querySelector('.home-preview-card-skeleton')).toBeNull();
    expect(container.querySelector('.home-cards-nav-wrap')).toBeNull();
  });
});
