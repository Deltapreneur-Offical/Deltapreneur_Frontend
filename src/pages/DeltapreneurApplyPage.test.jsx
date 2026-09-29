import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DeltapreneurApplyPage from './DeltapreneurApplyPage';

const mocks = vi.hoisted(() => ({
  submitApplication: vi.fn(),
}));

vi.mock('../api/services', () => ({
  deltapreneurOnboardingAPI: {
    submitApplication: mocks.submitApplication,
  },
}));

vi.mock('../components/layout/AppLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/deltapreneurs/apply']}>
      <DeltapreneurApplyPage />
    </MemoryRouter>,
  );
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByPlaceholderText('Your full name'), 'Test Applicant');
  await userEvent.type(screen.getByPlaceholderText('you@company.com'), 'test@example.com');
  await userEvent.type(screen.getByPlaceholderText('25,00,000'), '2000000');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
}

describe('DeltapreneurApplyPage success screen', () => {
  beforeEach(() => {
    mocks.submitApplication.mockReset();
    mocks.submitApplication.mockResolvedValue({ data: { success: true } });
    window.scrollTo = vi.fn();
  });

  it('after submit shows success card with confetti burst and scrolls to top', async () => {
    renderPage();
    await fillAndSubmit();

    // Success screen replaces the form.
    await screen.findByText('Application submitted');
    expect(screen.getByText(/our team reviews every application manually/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Home/ })).toBeInTheDocument();

    // Confetti burst rendered (26 pieces) inside the success card.
    const burst = document.querySelectorAll('.dp-confetti-burst');
    expect(burst.length).toBe(26);

    // Scrolled to top via the AppLayout-aware helper.
    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });
  });

  it('failed submission keeps the form and shows the error', async () => {
    mocks.submitApplication.mockRejectedValue({
      response: { data: { detail: 'Validation failed' } },
    });
    renderPage();
    await fillAndSubmit();

    await screen.findByText(/Validation failed/);
    expect(screen.queryByText('Application submitted')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.dp-confetti-burst').length).toBe(0);
  });
});
