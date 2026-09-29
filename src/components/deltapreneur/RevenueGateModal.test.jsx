import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RevenueGateModal from './RevenueGateModal';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@example.com' } }),
}));

const declareRevenueMock = vi.fn(() =>
  Promise.resolve({ data: { data: { eligible: true } } }),
);
const linkedInAuthUrlMock = vi.fn(() =>
  Promise.resolve({ data: { url: 'https://linkedin.com/oauth?x=1' } }),
);

vi.mock('../../api/services', () => ({
  deltapreneurOnboardingAPI: { declareRevenue: (...a) => declareRevenueMock(...a) },
  communityAPI: { linkedInAuthUrl: (...a) => linkedInAuthUrlMock(...a) },
}));

function renderModal(open = true) {
  return render(
    <MemoryRouter>
      <RevenueGateModal open={open} onClose={() => {}} />
    </MemoryRouter>,
  );
}

function typeRevenue(value) {
  fireEvent.change(screen.getByPlaceholderText('50,00,000'), {
    target: { value },
  });
}

beforeEach(() => {
  navigateMock.mockClear();
  declareRevenueMock.mockClear();
  linkedInAuthUrlMock.mockClear();
});

describe('RevenueGateModal', () => {
  it('renders the dialog when open and not when closed', () => {
    const { unmount } = renderModal(true);
    expect(screen.getByRole('dialog')).toBeTruthy();
    unmount();
    renderModal(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the typed amount in words instead of threshold lines', () => {
    renderModal(true);
    typeRevenue('5000000');

    expect(screen.getByText(/₹ 50,00,000/)).toBeTruthy();
    expect(screen.getByText(/fifty lakh/i)).toBeTruthy();
    // The old threshold hint lines must never appear.
    expect(screen.queryByText(/you can join directly/i)).toBeNull();
    expect(screen.queryByText(/application form/i)).toBeNull();
  });

  it('shows words for just above the threshold without any qualifying copy', () => {
    renderModal(true);
    typeRevenue('4000006');

    expect(screen.getByText(/forty lakh six/i)).toBeTruthy();
    expect(screen.queryByText(/you can join directly/i)).toBeNull();
  });

  it('below 40L: routes to the apply page without recording anything', async () => {
    renderModal(true);
    typeRevenue('400000');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await vi.waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/deltapreneurs/apply', expect.any(Object));
    });
    expect(declareRevenueMock).not.toHaveBeenCalled();
    expect(linkedInAuthUrlMock).not.toHaveBeenCalled();
  });

  it('at or above 40L: records revenue then starts the LinkedIn connect', async () => {
    renderModal(true);
    typeRevenue('5000000');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await vi.waitFor(() => {
      expect(declareRevenueMock).toHaveBeenCalledWith(5000000);
      expect(linkedInAuthUrlMock).toHaveBeenCalledTimes(1);
    });
  });
});
