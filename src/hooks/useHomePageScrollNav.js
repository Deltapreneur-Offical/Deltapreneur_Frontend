import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Shared scroll behavior for public pages using TopNavbar + HomeNavbar (same as Homepage).
 * Toggles body/nav scrolled classes so the 2nd nav hides visually while its document
 * space stays reserved (no page jump when returning to top).
 */
export default function useHomePageScrollNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef(null);
  const scrolledRef = useRef(false);
  const lastYRef = useRef(null);
  const scrollingTimerRef = useRef(0);
  const rafRef = useRef(0);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      const y = window.scrollY;
      const scrolled = y > 8;

      if (lastYRef.current !== y) {
        if (lastYRef.current != null) {
          document.body.classList.add('is-scrolling');
          window.clearTimeout(scrollingTimerRef.current);
          scrollingTimerRef.current = window.setTimeout(() => {
            document.body.classList.remove('is-scrolling');
          }, 140);
        }
        lastYRef.current = y;
      }

      if (scrolled === scrolledRef.current) return;
      scrolledRef.current = scrolled;

      document.body.classList.toggle('scrolled', scrolled);
      navRef.current?.classList.toggle('scrolled', scrolled);
      setIsScrolled(scrolled);
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('home-page-html');
    document.body.classList.add('home-page-body');
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      document.documentElement.classList.remove('home-page-html');
      document.body.classList.remove('home-page-body');
      document.body.classList.remove('scrolled');
      document.body.classList.remove('is-scrolling');
      window.removeEventListener('scroll', handleScroll);
      window.cancelAnimationFrame(rafRef.current);
      window.clearTimeout(scrollingTimerRef.current);
    };
  }, [handleScroll]);

  return { isScrolled, navRef };
}
