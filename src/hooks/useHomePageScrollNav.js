import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Shared scroll behavior for public pages using TopNavbar + HomeNavbar (same as Homepage).
 * Toggles body/nav scrolled classes so the 2nd nav hides visually while its document
 * space stays reserved (no page jump when returning to top).
 */
export default function useHomePageScrollNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef(null);

  const handleScroll = useCallback(() => {
    // Small threshold avoids flicker at the very top while still feeling instant
    const scrolled = window.scrollY > 8;

    if (scrolled) {
      document.body.classList.add('scrolled');
    } else {
      document.body.classList.remove('scrolled');
    }

    if (navRef.current) {
      if (scrolled) {
        navRef.current.classList.add('scrolled');
      } else {
        navRef.current.classList.remove('scrolled');
      }
    }

    setIsScrolled(scrolled);
  }, []);

  useEffect(() => {
    document.body.classList.add('home-page-body');
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      document.body.classList.remove('home-page-body');
      document.body.classList.remove('scrolled');
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return { isScrolled, navRef };
}
