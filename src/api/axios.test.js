import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const requestUse = vi.fn();
  const responseUse = vi.fn();
  const apiInstance = vi.fn((config) => Promise.resolve({ config }));
  apiInstance.defaults = { baseURL: 'http://127.0.0.1:8000' };
  apiInstance.interceptors = {
    request: { use: requestUse },
    response: { use: responseUse },
  };

  return {
    apiInstance,
    requestUse,
    responseUse,
    createMock: vi.fn(() => apiInstance),
    postMock: vi.fn(),
    isPublicBrowsePathMock: vi.fn(() => false),
    sanitizeAxiosErrorMock: vi.fn((error) => error),
    isVaPublicRequestMock: vi.fn(() => false),
  };
});

vi.mock('axios', () => ({
  default: {
    create: mocks.createMock,
    post: mocks.postMock,
  },
}));

vi.mock('../utils/authSession', async () => {
  const actual = await vi.importActual('../utils/authSession');
  return {
    ...actual,
    isPublicBrowsePath: mocks.isPublicBrowsePathMock,
  };
});

vi.mock('../utils/apiError', () => ({
  sanitizeAxiosError: mocks.sanitizeAxiosErrorMock,
  isVaPublicRequest: mocks.isVaPublicRequestMock,
}));

let requestHandler;
let responseErrorHandler;

describe('api axios client', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
    document.cookie = 'csrf_token=; Max-Age=0; path=/';
    requestHandler = undefined;
    responseErrorHandler = undefined;

    mocks.requestUse.mockImplementation((handler) => {
      requestHandler = handler;
    });
    mocks.responseUse.mockImplementation((success, error) => {
      responseErrorHandler = error;
    });

    await import('./axios');
  });

  it('adds auth and csrf headers to mutating requests', async () => {
    const { setStoredAccessToken } = await import('../utils/authSession');
    setStoredAccessToken('access-123');
    document.cookie = 'csrf_token=csrf-abc; path=/';

    const config = await requestHandler({ method: 'post', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer access-123');
    expect(config.headers['X-CSRF-Token']).toBe('csrf-abc');
  });

  it('refreshes the session and retries the original request', async () => {
    localStorage.setItem('refreshToken', 'refresh-123');
    document.cookie = 'csrf_token=csrf-abc; path=/';
    mocks.postMock.mockResolvedValue({
      data: {
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        },
      },
    });

    const error = {
      config: {
        url: '/api/v1/protected',
        method: 'post',
        headers: {},
      },
      response: {
        status: 401,
        data: { detail: 'Not authenticated' },
      },
    };

    await responseErrorHandler(error);

    expect(mocks.postMock).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      { refreshToken: 'refresh-123' },
      expect.objectContaining({
        baseURL: 'http://127.0.0.1:8000',
        withCredentials: true,
      }),
    );
    const { getStoredAccessToken } = await import('../utils/authSession');
    expect(getStoredAccessToken()).toBe('new-access');
    // Access + refresh JWTs are not persisted in localStorage.
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(mocks.apiInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/protected',
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access',
        }),
        _retry: true,
      }),
    );
  });

  it('does not clear the session when refresh fails due to network error', async () => {
    const { setStoredAccessToken, getStoredAccessToken } = await import('../utils/authSession');
    setStoredAccessToken('still-valid-access');
    document.cookie = 'csrf_token=csrf-abc; path=/';
    mocks.postMock.mockRejectedValue(new Error('Network Error'));

    const hrefDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: 'http://127.0.0.1:5173/dashboard', pathname: '/dashboard' },
    });

    const error = {
      config: {
        url: '/api/v1/protected',
        method: 'get',
        headers: {},
      },
      response: {
        status: 401,
        data: { detail: 'Invalid token.' },
      },
    };

    await expect(responseErrorHandler(error)).rejects.toBeTruthy();
    expect(getStoredAccessToken()).toBe('still-valid-access');
    expect(window.location.href).toContain('/dashboard');

    if (hrefDescriptor) {
      Object.defineProperty(window, 'location', hrefDescriptor);
    }
  });

  it('clears the session when refresh returns 401', async () => {
    const { setStoredAccessToken, getStoredAccessToken } = await import('../utils/authSession');
    setStoredAccessToken('expired-access');
    document.cookie = 'csrf_token=csrf-abc; path=/';
    mocks.postMock.mockRejectedValue({
      response: {
        status: 401,
        data: { error: 'Refresh token expired' },
      },
    });

    const error = {
      config: {
        url: '/api/v1/protected',
        method: 'get',
        headers: {},
      },
      response: {
        status: 401,
        data: { detail: 'Invalid token.' },
      },
    };

    await expect(responseErrorHandler(error)).rejects.toBeTruthy();
    expect(getStoredAccessToken()).toBeNull();
  });
  it('bypasses sanitization for VA public submission errors', async () => {
    mocks.isVaPublicRequestMock.mockReturnValue(true);
    const vaError = {
      config: { url: '/api/v1/virtual-assistant' },
      response: {
        status: 409,
        data: { detail: 'You have already applied for this role.' },
      },
    };

    await expect(responseErrorHandler(vaError)).rejects.toBe(vaError);
    expect(mocks.sanitizeAxiosErrorMock).not.toHaveBeenCalled();
  });

  it('sanitizes non-VA errors normally', async () => {
    mocks.isVaPublicRequestMock.mockReturnValue(false);
    const otherError = {
      config: { url: '/api/v1/other' },
      response: {
        status: 500,
        data: { detail: 'internal error' },
      },
    };
    const sanitized = {
      ...otherError,
      response: { ...otherError.response, data: { detail: 'safe message' } },
    };
    mocks.sanitizeAxiosErrorMock.mockReturnValue(sanitized);

    await expect(responseErrorHandler(otherError)).rejects.toEqual(sanitized);
    expect(mocks.sanitizeAxiosErrorMock).toHaveBeenCalled();
  });
});
