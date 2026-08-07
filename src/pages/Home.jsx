import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import TopNavbar from '../components/common/TopNavbar';

import HomeNavbar from '../components/common/HomeNavbar';

import HeroGlow from '../components/common/HeroGlow';
import DomainSearchBar from '../components/common/DomainSearchBar';

import ExploreSection from '../components/common/ExploreSection';

import HomeFooter from '../components/common/HomeFooter';
import useHomePageScrollNav from '../hooks/useHomePageScrollNav';



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

  const [openDropdown, setOpenDropdown] = useState(null);
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



  return (

    <div className="relative min-w-0 bg-white overflow-visible">

      <TopNavbar homeMobileMenu hideContactUs isScrolled={isScrolled} />

      <HomeNavbar

        navRef={navRef}

        openDropdown={openDropdown}

        setOpenDropdown={setOpenDropdown}

        navigate={navigate}

        isScrolled={isScrolled}

      />



      <div className="home-hero-search-stack relative z-10 overflow-visible">
        <HeroGlow />
      </div>

      {/* Sticky search bar — persists across all page sections while scrolling */}
      <div className="hero-search-sticky-wrapper pl-4 pr-4 sm:pl-6 sm:pr-5 md:pl-10 lg:pl-20 lg:pr-8">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="w-full">
            <DomainSearchBar embedded className="mt-7 sm:mt-8 lg:mt-3" />
          </div>
        </div>
      </div>

      <div className="home-hero-align-outer">
        <div className="home-hero-align-inner">
          <ExploreSection />
        </div>
      </div>

      <HomeFooter />

    </div>

  );

}
