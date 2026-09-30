import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';
import {
  BOTTOM_NAV_TABS,
  isBottomNavHiddenRoute,
  isBottomNavTabActive,
} from './mobileBottomNav/bottomNavRoutes';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomNav />
    </MemoryRouter>,
  );
}

function getWrapper(container) {
  return container.querySelector('.mobile-bottom-nav');
}

function getNav(container) {
  return container.querySelector('.mobile-bottom-nav__bar');
}

/** Dispatch a vertical scroll on an element (scroll events do not bubble). */
function scrollElement(el, top) {
  el.scrollTop = top;
  act(() => {
    el.dispatchEvent(new Event('scroll'));
  });
}

describe('bottomNavRoutes', () => {
  it.each([
    '/login',
    '/register',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/complete-profile',
    '/complete-profile/step-2',
    '/cart',
    '/cart/review',
    '/checkout',
    '/checkout/step/2',
    '/payment/success',
    '/storefront/checkout/abc',
    '/admin',
    '/admin/virtual-assistants/applications/123',
    '/admin/',
  ])('hides on %s', (path) => {
    expect(isBottomNavHiddenRoute(path)).toBe(true);
  });

  it.each([
    '/',
    '/domains',
    '/ventures',
    '/auctions',
    '/technology/12',
    '/creator/abc',
    '/administration-guide',
    '/loginfo',
    '/about',
  ])('shows on %s', (path) => {
    expect(isBottomNavHiddenRoute(path)).toBe(false);
  });

  it('marks tabs active for nested paths and aliases only', () => {
    const byId = Object.fromEntries(BOTTOM_NAV_TABS.map((tab) => [tab.id, tab]));
    expect(isBottomNavTabActive(byId.technology, '/technology/123')).toBe(true);
    expect(isBottomNavTabActive(byId.creator, '/creator/abc')).toBe(true);
    expect(isBottomNavTabActive(byId.domains, '/alldomains')).toBe(true);
    expect(isBottomNavTabActive(byId.ventures, '/co-ventures')).toBe(true);
    expect(isBottomNavTabActive(byId.creator, '/creators-list')).toBe(false);
    expect(isBottomNavTabActive(byId.auctions, '/domains')).toBe(false);
  });
});

describe('MobileBottomNav', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.className = '';
    document.body.innerHTML = '';
  });

  it('renders the five tabs with the right targets', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const links = Array.from(nav.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/domains',
      '/ventures',
      '/auctions',
      '/technology',
      '/creator',
    ]);
    expect(links.map((a) => a.textContent)).toEqual([
      'Domains',
      'Ventures',
      'Auctions',
      'Technologies',
      'Deltapreneurs',
    ]);
  });

  it('marks the active tab (including nested routes) with aria-current', () => {
    renderAt('/technology/123');
    const active = document.querySelector('a[aria-current="page"]');
    expect(active).not.toBeNull();
    expect(active.getAttribute('href')).toBe('/technology');
    expect(document.querySelectorAll('a[aria-current="page"]')).toHaveLength(1);
  });

  it.each(['/login', '/register', '/complete-profile/x', '/checkout/pay', '/admin/anything', '/auth/callback'])(
    'renders nothing and adds no body class on %s',
    (path) => {
      const { container } = renderAt(path);
      expect(getWrapper(container)).toBeNull();
      expect(document.body.classList.contains('has-mobile-bottom-nav')).toBe(false);
    },
  );

  it('adds the layout body class while mounted and removes it on unmount', () => {
    const { unmount } = renderAt('/domains');
    expect(document.body.classList.contains('has-mobile-bottom-nav')).toBe(true);
    unmount();
    expect(document.body.classList.contains('has-mobile-bottom-nav')).toBe(false);
  });

  describe('auto-hide on scroll', () => {
    it('hides on scroll, is inert immediately, and returns after 300ms idle', () => {
      const { container } = renderAt('/domains');
      const wrapper = getWrapper(container);
      const nav = getNav(container);
      expect(wrapper.getAttribute('data-hidden')).toBe('false');
      expect(nav.hasAttribute('inert')).toBe(false);

      scrollElement(document.documentElement, 40);
      expect(wrapper.getAttribute('data-hidden')).toBe('true');
      expect(nav.hasAttribute('inert')).toBe(true);
      nav.querySelectorAll('a').forEach((a) => expect(a.getAttribute('tabindex')).toBe('-1'));
      expect(screen.getByRole('button', { name: 'Show navigation' })).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(wrapper.getAttribute('data-hidden')).toBe('true');

      act(() => {
        vi.advanceTimersByTime(2);
      });
      expect(wrapper.getAttribute('data-hidden')).toBe('false');
      expect(nav.hasAttribute('inert')).toBe(false);
      expect(screen.getByRole('button', { name: 'Hide navigation' })).toBeTruthy();
    });

    it('keeps the curved handle visible while the bar is auto-hidden', () => {
      const { container } = renderAt('/domains');
      scrollElement(document.documentElement, 40);
      expect(getWrapper(container).getAttribute('data-hidden')).toBe('true');
      expect(container.querySelector('.mobile-bottom-nav__handle')).not.toBeNull();
      expect(container.querySelector('.mobile-bottom-nav__shape')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Show navigation' })).toBeTruthy();
    });

    it('keeps hidden while scrolling continues (idle timer restarts)', () => {
      const { container } = renderAt('/domains');
      const wrapper = getWrapper(container);
      scrollElement(document.documentElement, 10);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      scrollElement(document.documentElement, 50);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(wrapper.getAttribute('data-hidden')).toBe('true');
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(wrapper.getAttribute('data-hidden')).toBe('false');
    });

    it('reacts to scrolling inside an inner container (logged-in app shell)', () => {
      const inner = document.createElement('div');
      inner.className = 'app-layout-scroll-body';
      document.body.appendChild(inner);
      const { container } = renderAt('/ventures');
      const wrapper = getWrapper(container);

      scrollElement(inner, 120);
      expect(wrapper.getAttribute('data-hidden')).toBe('true');
      act(() => {
        vi.advanceTimersByTime(301);
      });
      expect(wrapper.getAttribute('data-hidden')).toBe('false');
    });

    it('ignores horizontal-only scrolling (card strips)', () => {
      const strip = document.createElement('div');
      document.body.appendChild(strip);
      const { container } = renderAt('/domains');
      const wrapper = getWrapper(container);

      scrollElement(strip, 0); // first event, no vertical movement yet
      act(() => {
        vi.advanceTimersByTime(400);
      });
      strip.scrollLeft = 80;
      act(() => {
        strip.dispatchEvent(new Event('scroll'));
      });
      expect(wrapper.getAttribute('data-hidden')).toBe('false');
    });
  });

  describe('manual hide', () => {
    it('hides with the down chevron, and scrolling/idle never reopens it', () => {
      const { container } = renderAt('/auctions');
      const wrapper = getWrapper(container);
      const nav = getNav(container);
      expect(screen.queryByRole('button', { name: 'Show navigation' })).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Hide navigation' }));
      expect(wrapper.getAttribute('data-hidden')).toBe('true');
      expect(nav.hasAttribute('inert')).toBe(true);
      expect(screen.getByRole('button', { name: 'Show navigation' })).toBeTruthy();

      scrollElement(document.documentElement, 30);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(wrapper.getAttribute('data-hidden')).toBe('true');
      expect(screen.getByRole('button', { name: 'Show navigation' })).toBeTruthy();
    });

    it('reopens only through the up chevron on the handle', () => {
      const { container } = renderAt('/auctions');
      const wrapper = getWrapper(container);
      const nav = getNav(container);
      fireEvent.click(screen.getByRole('button', { name: 'Hide navigation' }));
      fireEvent.click(screen.getByRole('button', { name: 'Show navigation' }));
      expect(wrapper.getAttribute('data-hidden')).toBe('false');
      expect(nav.hasAttribute('inert')).toBe(false);
      expect(screen.queryByRole('button', { name: 'Show navigation' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Hide navigation' })).toBeTruthy();
    });

    it('reopens immediately from the handle even during scrolling', () => {
      const { container } = renderAt('/auctions');
      const wrapper = getWrapper(container);
      scrollElement(document.documentElement, 40);
      expect(wrapper.getAttribute('data-hidden')).toBe('true');
      fireEvent.click(screen.getByRole('button', { name: 'Show navigation' }));
      expect(wrapper.getAttribute('data-hidden')).toBe('false');
      expect(getNav(container).hasAttribute('inert')).toBe(false);
    });
  });

  describe('overlays', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('removes the bar and handle while app-overlay-open is set', async () => {
      const { container } = renderAt('/domains');
      fireEvent.click(screen.getByRole('button', { name: 'Hide navigation' }));
      expect(screen.getByRole('button', { name: 'Show navigation' })).toBeTruthy();

      document.body.classList.add('app-overlay-open');
      await waitFor(() => expect(getWrapper(container)).toBeNull());
      expect(screen.queryByRole('button', { name: 'Show navigation' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Hide navigation' })).toBeNull();

      document.body.classList.remove('app-overlay-open');
      await waitFor(() => expect(getWrapper(container)).not.toBeNull());
      // manual hide survives the overlay
      expect(getWrapper(container).getAttribute('data-hidden')).toBe('true');
      expect(screen.getByRole('button', { name: 'Show navigation' })).toBeTruthy();
    });

    it('hides while the mobile menu (home-menu-open) is open', async () => {
      const { container } = renderAt('/domains');
      document.body.classList.add('home-menu-open');
      await waitFor(() => expect(getWrapper(container)).toBeNull());
      document.body.classList.remove('home-menu-open');
      await waitFor(() => expect(getWrapper(container)).not.toBeNull());
    });

    it('hides for a visible aria-modal dialog and returns when it is removed', async () => {
      const { container } = renderAt('/domains');
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      document.body.appendChild(dialog);
      await waitFor(() => expect(getWrapper(container)).toBeNull());

      dialog.remove();
      await waitFor(() => expect(getWrapper(container)).not.toBeNull());
    });

    it('ignores a hidden aria-modal left in the DOM', async () => {
      const variants = [
        (el) => {
          el.style.display = 'none';
        },
        (el) => {
          el.hidden = true;
        },
        (el) => {
          el.setAttribute('aria-hidden', 'true');
        },
        (el) => {
          el.setAttribute('inert', '');
        },
        (el) => {
          el.style.visibility = 'hidden';
        },
      ];
      const { container } = renderAt('/domains');
      for (const hide of variants) {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        hide(dialog);
        document.body.appendChild(dialog);
        await new Promise((resolve) => setTimeout(resolve, 40));
        expect(getWrapper(container)).not.toBeNull();
        dialog.remove();
      }

      // A modal inside a display:none ancestor is hidden too.
      const host = document.createElement('div');
      host.style.display = 'none';
      const nested = document.createElement('div');
      nested.setAttribute('aria-modal', 'true');
      host.appendChild(nested);
      document.body.appendChild(host);
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(getWrapper(container)).not.toBeNull();
    });

    it('reacts when a lingering modal becomes visible', async () => {
      const { container } = renderAt('/domains');
      const dialog = document.createElement('div');
      dialog.setAttribute('aria-modal', 'true');
      dialog.style.display = 'none';
      document.body.appendChild(dialog);
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(getWrapper(container)).not.toBeNull();

      dialog.style.display = 'block';
      await waitFor(() => expect(getWrapper(container)).toBeNull());
    });
  });
});
