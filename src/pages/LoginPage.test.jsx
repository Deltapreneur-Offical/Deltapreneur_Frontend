import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

const mocks = vi.hoisted(() => ({
  startGoogleOAuth: vi.fn(),
  startLinkedInOAuth: vi.fn(),
}));

vi.mock('../utils/socialOAuth', () => ({
  startGoogleOAuth: mocks.startGoogleOAuth,
  startLinkedInOAuth: mocks.startLinkedInOAuth,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: true,
    login: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('../utils/backendReady', () => ({
  checkBackendDatabaseReady: vi.fn(async () => true),
  DATABASE_UNAVAILABLE_HINT: 'Database is not reachable.',
}));

vi.mock('../hooks/useBotProtection', () => ({
  useBotProtection: () => ({
    requiresTurnstile: false,
    getProtectionPayload: () => ({}),
    resetProtection: () => {},
    botProtectionProps: {},
  }),
}));

vi.mock('../api/services', () => ({
  authAPI: {
    login: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

import LoginPage from './LoginPage';

describe('LoginPage Google sign-in', () => {
  beforeEach(() => {
    mocks.startGoogleOAuth.mockReset();
    mocks.startLinkedInOAuth.mockReset();
  });

  it('keeps Google login clickable while session restore is still loading', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </I18nextProvider>,
    );

    const googleButton = await screen.findByRole('button', { name: /google/i });
    await userEvent.click(googleButton);

    expect(mocks.startGoogleOAuth).toHaveBeenCalledTimes(1);
  });
});
