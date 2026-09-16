import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppOverlay from './AppOverlay';

describe('AppOverlay', () => {
  it('renders on document.body so layout isolation cannot cover it', () => {
    render(
      <div className="app-main-content" data-testid="page">
        <AppOverlay>
          <div role="dialog">Submit Offer</div>
        </AppOverlay>
      </div>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByTestId('page').contains(dialog)).toBe(false);
  });
});
