import '@testing-library/jest-dom/vitest';

import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

function ensureWindowGlobals() {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  if (!window.ResizeObserver) {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserver;
  }

  if (!window.IntersectionObserver) {
    class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    window.IntersectionObserver = IntersectionObserver;
  }

  if (!window.scrollTo) {
    window.scrollTo = vi.fn();
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
}

beforeEach(() => {
  ensureWindowGlobals();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
