import { describe, expect, it, beforeEach } from 'vitest';
import {
  getStoredAccessToken,
  hasAuthSession,
  hasCookieAuthSession,
  isPublicBrowsePath,
  resolveAfterAuthNavigation,
  resolveOAuthCallbackNavigation,
  resolvePostLoginNavigation,
  saveReturnLocationBeforeOAuth,
  consumeReturnLocationBeforeOAuth,
} from './authSession';

describe('authSession', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    document.cookie = 'csrf_token=; Max-Age=0; path=/';
  });

  it('prefers accessToken over token', () => {
    localStorage.setItem('token', 'legacy');
    localStorage.setItem('accessToken', 'primary');
    expect(getStoredAccessToken()).toBe('primary');
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
    localStorage.setItem('accessToken', 'abc');
    expect(hasAuthSession()).toBe(true);

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
});
