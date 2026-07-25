import { describe, expect, it, beforeEach } from 'vitest';
import {
  accessTokenNeedsRefresh,
  clearAuthTokens,
  getAccessTokenExpiryMs,
  getStoredAccessToken,
  hasAuthSession,
  hasCookieAuthSession,
  isAccessTokenFresh,
  isPublicBrowsePath,
  resolveAfterAuthNavigation,
  resolveOAuthCallbackNavigation,
  resolvePostLoginNavigation,
  resolvePostLoginPath,
  sanitizeSafeAppPath,
  saveReturnLocationBeforeOAuth,
  setStoredAccessToken,
  consumeReturnLocationBeforeOAuth,
} from './authSession';

describe('authSession', () => {
  beforeEach(() => {
    clearAuthTokens();
    localStorage.clear();
    window.history.pushState({}, '', '/');
    document.cookie = 'csrf_token=; Max-Age=0; path=/';
  });

  it('prefers memory access token and clears legacy localStorage', () => {
    localStorage.setItem('token', 'legacy');
    localStorage.setItem('accessToken', 'primary');
    expect(getStoredAccessToken()).toBe('primary');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(getStoredAccessToken()).toBe('primary');
  });

  it('stores access token in memory only', () => {
    setStoredAccessToken('mem-token');
    expect(getStoredAccessToken()).toBe('mem-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('detects public browse paths', () => {
    expect(isPublicBrowsePath('/join-form')).toBe(true);
    expect(isPublicBrowsePath('/dashboard')).toBe(false);
  });

  it('resolves complete-profile navigation for incomplete users', () => {
    const nav = resolveAfterAuthNavigation({ pathname: '/auctions', search: '?tab=active' }, {
      role: 'USER',
      profileComplete: false,
    });

    expect(nav.pathname).toBe('/complete-profile');
    expect(nav.state.from.pathname).toBe('/auctions');
  });

  it('keeps saved post-login path when available', () => {
    const nav = resolvePostLoginNavigation(
      { pathname: '/creator', search: '?tab=my', state: { from: 'details' } },
      { role: 'USER' },
    );

    expect(nav.pathname).toBe('/creator');
    expect(nav.state).toEqual({ from: 'details' });
  });

  it('persists and consumes OAuth return locations', () => {
    saveReturnLocationBeforeOAuth({ pathname: '/domains', search: '?id=1' });
    expect(consumeReturnLocationBeforeOAuth()).toEqual({
      pathname: '/domains',
      search: '?id=1',
      hash: '',
      state: undefined,
    });
  });

  it('recognizes cookie or token auth sessions', () => {
    setStoredAccessToken('abc');
    expect(hasAuthSession()).toBe(true);
    clearAuthTokens();

    document.cookie = 'csrf_token=test-cookie; path=/';
    expect(hasCookieAuthSession()).toBe(true);
  });

  it('uses saved OAuth return locations when present', () => {
    saveReturnLocationBeforeOAuth({ pathname: '/technology', search: '?tab=all' });
    const nav = resolveOAuthCallbackNavigation({ profileComplete: true }, '/dashboard');
    expect(nav.pathname).toBe('/technology');
  });

  it('defaults post-login navigation to homepage', () => {
    const nav = resolveAfterAuthNavigation(null, { role: 'USER', profileComplete: true });
    expect(nav.pathname).toBe('/');
  });

  it('rejects open-redirect style post-login paths', () => {
    expect(sanitizeSafeAppPath('//evil.com')).toBeNull();
    expect(sanitizeSafeAppPath('https://evil.com')).toBeNull();
    expect(sanitizeSafeAppPath('/\\evil.com')).toBeNull();
    expect(sanitizeSafeAppPath('/cart')).toBe('/cart');
    expect(resolvePostLoginPath('//evil.com', { role: 'USER' })).toBe('/');
  });

  it('reads JWT exp and detects near-expiry for proactive refresh', () => {
    const expSec = Math.floor(Date.now() / 1000) + 30;
    const payload = btoa(JSON.stringify({ exp: expSec }));
    const token = `hdr.${payload}.sig`;
    expect(getAccessTokenExpiryMs(token)).toBe(expSec * 1000);
    expect(accessTokenNeedsRefresh(token, 90_000)).toBe(true);
    expect(isAccessTokenFresh(token, 90_000)).toBe(false);

    const farExp = Math.floor(Date.now() / 1000) + 3600;
    const farPayload = btoa(JSON.stringify({ exp: farExp }));
    const farToken = `hdr.${farPayload}.sig`;
    expect(accessTokenNeedsRefresh(farToken, 90_000)).toBe(false);
    expect(isAccessTokenFresh(farToken, 90_000)).toBe(true);

    // Opaque / non-JWT tokens are not treated as fresh (must still HTTP-refresh).
    expect(isAccessTokenFresh('expired-access', 90_000)).toBe(false);
    expect(accessTokenNeedsRefresh('expired-access', 90_000)).toBe(false);
  });
});
