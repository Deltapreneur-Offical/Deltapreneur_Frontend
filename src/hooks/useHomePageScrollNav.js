import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Shared scroll behavior for public pages using TopNavbar + HomeNavbar (same as Homepage).
 * Toggles body classes and nav ref so the logo moves into the sticky top bar on scroll.
 */
export default function useHomePageScrollNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef(null);

  const handleScroll = useCallback(() => {
    const scrolled = window.scrollY > 1;

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
