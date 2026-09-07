import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { getStoredAccessToken, setStoredAccessToken } from '../utils/authSession';

const mocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  logout: vi.fn(),
  ensureAccessTokenFromRefresh: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {},
  ensureAccessTokenFromRefresh: mocks.ensureAccessTokenFromRefresh,
}));

vi.mock('../api/services', () => ({
  profileAPI: {
    getMe: mocks.getMe,
  },
  authAPI: {
    logout: mocks.logout,
  },
}));

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext stale session 401s', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = 'csrf_token=; Max-Age=0; path=/';
    setStoredAccessToken(null);
    mocks.getMe.mockReset();
    mocks.logout.mockResolvedValue({});
    mocks.ensureAccessTokenFromRefresh.mockResolvedValue(null);
  });

  it('does not treat csrf_token alone as a session or call /auth/me', async () => {
    document.cookie = 'csrf_token=leftover; path=/';
    mocks.ensureAccessTokenFromRefresh.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.ensureAccessTokenFromRefresh).toHaveBeenCalled();
    expect(mocks.getMe).not.toHaveBeenCalled();
    expect(result.current.hasAccessToken).toBe(false);
    expect(result.current.user).toBeNull();
    expect(getStoredAccessToken()).toBeNull();
  });

  it('restores a session via refresh before /auth/me when no memory token exists', async () => {
    document.cookie = 'csrf_token=session; path=/';
    mocks.ensureAccessTokenFromRefresh.mockImplementation(async () => {
      setStoredAccessToken('restored-access');
      return 'restored-access';
    });
    mocks.getMe.mockResolvedValue({
      data: { data: { email: 'admin@deltapreneur.com', role: 'ADMIN' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user?.email).toBe('admin@deltapreneur.com'));
    expect(mocks.getMe).toHaveBeenCalled();
    expect(result.current.hasAccessToken).toBe(true);
    expect(getStoredAccessToken()).toBe('restored-access');
  });

  it('does not clear a newer login when a stale /auth/me 401 arrives', async () => {
    setStoredAccessToken('old-access');
    let rejectMe;
    mocks.getMe.mockImplementation(
      () => new Promise((_, reject) => {
        rejectMe = reject;
      }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(mocks.getMe).toHaveBeenCalled());

    act(() => {
      result.current.login({ accessToken: 'fresh-access' }, null);
    });
    expect(getStoredAccessToken()).toBe('fresh-access');

    await act(async () => {
      rejectMe({
        response: {
          status: 401,
          data: {
            detail: 'Session expired. Please sign in again.',
            message: 'Session expired. Please sign in again.',
            error: 'Session expired. Please sign in again.',
          },
        },
      });
    });

    expect(getStoredAccessToken()).toBe('fresh-access');
    expect(result.current.hasAccessToken).toBe(true);
  });

  it('clears auth when /auth/me 401 belongs to the current session', async () => {
    setStoredAccessToken('current-access');
    mocks.getMe.mockRejectedValue({
      response: {
        status: 401,
        data: { detail: 'Session expired. Please sign in again.' },
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.hasAccessToken).toBe(false));
    expect(getStoredAccessToken()).toBeNull();
  });
});
