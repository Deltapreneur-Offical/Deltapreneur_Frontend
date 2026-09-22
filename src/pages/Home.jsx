import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import TopNavbar from '../components/common/TopNavbar';

import HomeNavbar from '../components/common/HomeNavbar';

import HeroGlow from '../components/common/HeroGlow';
import DomainSearchBar from '../components/common/DomainSearchBar';

import ExploreSection from '../components/common/ExploreSection';

import HomeFooter from '../components/common/HomeFooter';
import useHomePageScrollNav from '../hooks/useHomePageScrollNav';



const HOME_PRICE_SELECTORS = [
  '.domain-card-price-line',
  '.domain-search-card__price',
  '.domain-listing-card__price-value',
  '.home-auction-preview-card__current-bid-value',
  '.home-auction-preview-card__live-bid-value',
  '.home-operations-preview-card__price-amount',
  '.tech-service-card__price-amount',
  '.creator-expected-rate__value',
  '.reg-category-card__price',
  '.reg-category-card__cta',
  '.reg-mini-card__price',
].join(',');

function wrapHomeRupeeSymbols(root) {
  if (!root || typeof document === 'undefined') return;

  root.querySelectorAll(HOME_PRICE_SELECTORS).forEach((target) => {
    const textNodes = [];
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.includes('\u20B9')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('.home-price-rupee-symbol')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      const parts = textNode.nodeValue.split('\u20B9');

      parts.forEach((part, index) => {
        if (index > 0) {
          const symbol = document.createElement('span');
          symbol.className = 'home-price-rupee-symbol';
          symbol.textContent = '\u20B9';
          fragment.appendChild(symbol);
        }
        if (part) fragment.appendChild(document.createTextNode(part));
      });

      textNode.parentNode?.replaceChild(fragment, textNode);
    });
  });
}

export const searchDomainRedirect = (domainQuery, selectedExtension = '.com') => {

  const value = domainQuery.trim().toLowerCase();



  if (!value) {

    throw new Error('Please enter a domain name');

  }



  const fullDomainRegex = /^[a-z0-9-]+(\.(com|in|ai|io))?$/;

  let finalDomain = '';



  if (fullDomainRegex.test(value) && value.includes('.')) {

    finalDomain = value;

  } else {

    const nameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;



    if (!nameRegex.test(value)) {

      throw new Error('Invalid domain name. Use only letters, numbers, and hyphens');

    }



    finalDomain = value + selectedExtension;

  }



  return `/storefront?domain=${encodeURIComponent(finalDomain)}`;
};

export default function Home() {

  const navigate = useNavigate();

  const homeRootRef = useRef(null);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [homepageSearchMode, setHomepageSearchMode] = useState('new');
  const { isScrolled, navRef } = useHomePageScrollNav();

  useEffect(() => {

    const handleClickOutside = (e) => {
      const target = e.target;
      if (navRef.current?.contains(target)) return;
      if (target.closest?.('[data-home-nav-dropdown]')) return;
      setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);

  useEffect(() => {
    const root = homeRootRef.current;
    if (!root) return undefined;

    let frame = 0;
    const scheduleWrap = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => wrapHomeRupeeSymbols(root));
    };

    scheduleWrap();
    const observer = new MutationObserver(scheduleWrap);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);



  return (

    <div ref={homeRootRef} className="relative min-w-0 bg-white overflow-visible">

      <TopNavbar homeMobileMenu hideContactUs isScrolled={isScrolled} />

      <HomeNavbar

        navRef={navRef}

        openDropdown={openDropdown}

        setOpenDropdown={setOpenDropdown}

        navigate={navigate}

        isScrolled={isScrolled}

      />



      <div className="home-hero-search-stack relative z-0 overflow-visible">
        <HeroGlow />
      </div>

      {/* Sticky search bar — persists across all page sections while scrolling */}
      <div className="hero-search-sticky-wrapper relative z-20 px-4 sm:px-6 md:px-8 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="w-full">
            <DomainSearchBar
              embedded
              className="mt-7 sm:mt-8 lg:mt-3"
              onSearchModeChange={setHomepageSearchMode}
            />
          </div>
        </div>
      </div>

      <div className="home-hero-align-outer">
        <div className="home-hero-align-inner">
          <ExploreSection searchMode={homepageSearchMode} />
        </div>
      </div>

      <HomeFooter />

    </div>

  );

}
