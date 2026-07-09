import { useState, useEffect, useRef, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { useTranslation } from 'react-i18next';

import { motion, useReducedMotion } from 'framer-motion';
import { Headset, ShieldCheck } from 'lucide-react';

import TopNavbar from '../components/common/TopNavbar';

import HomeNavbar from '../components/common/HomeNavbar';

import HeroGlow from '../components/common/HeroGlow';
import DomainSearchBar from '../components/common/DomainSearchBar';
import ListingCardShell from '../components/listings/ListingCardShell';

import ExploreSection from '../components/common/ExploreSection';
import HomeFeaturesElectricGrid from '../components/home/HomeFeaturesElectricGrid';


import HomeFooter from '../components/common/HomeFooter';

import GlowButton from '../components/common/GlowButton';
import { operationsPathForSection, operationsReturnLocation } from '../utils/operationsSections';
import {
  homeCardHover,
  homeCardTap,
  homeFeatureIconHover,
  homeHeaderReveal,
  homeStaggerContainer,
  homeStaggerItem,
  homeViewport,
} from '../components/home/motion/homeMotion';



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
  const { user, hasAccessToken } = useAuth();

  const { t } = useTranslation();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const navRef = useRef(null);
  const reduceMotion = useReducedMotion();



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

    return () => {

      document.body.classList.remove('home-page-body');
      document.body.classList.remove('scrolled');

      window.removeEventListener('scroll', handleScroll);

    };

  }, [handleScroll]);





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



  const goToOperations = (section = 'assistance') => {
    const targetPath = operationsPathForSection(section);
    if (user || hasAccessToken) {
      navigate(targetPath);
    } else {
      navigate('/login', { state: { from: operationsReturnLocation(section) } });
    }
  };

  const features = [
    {
      icon: <Headset className="w-10 h-10 text-gray-900" strokeWidth={1.75} aria-hidden />,
      title: t('homeVirtualAssistancesTitle', { defaultValue: 'Virtual Assistants' }),
      onClick: () => goToOperations('assistances'),
    },
    {
      icon: <ShieldCheck className="w-10 h-10 text-gray-900" strokeWidth={1.75} aria-hidden />,
      title: t('homeComplianceTitle', { defaultValue: 'Compliance' }),
      onClick: () => goToOperations('compliances'),
    },
  ];



  return (

    <div className="relative min-w-0 bg-white overflow-visible">

      <TopNavbar homeMobileMenu hideContactUs isScrolled={isScrolled} />

      <HomeNavbar

        navRef={navRef}

        openDropdown={openDropdown}

        setOpenDropdown={setOpenDropdown}

        navigate={navigate}

        hideJoinCta

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

      <section className="home-features-section py-12 md:py-20">
        <div className="home-features-section-grid" aria-hidden="true" />
        <HomeFeaturesElectricGrid />
        <div className="home-features-section-content home-hero-align-inner">
          {reduceMotion ? (
            <header className="home-features-section-header">
              <p className="home-features-section-eyebrow">
                {t('homeServicesEyebrow', { defaultValue: 'SERVICES' })}
              </p>
              <h2 className="home-features-section-title">
                {t('homeServicesTitle', { defaultValue: 'Business Support Solutions' })}
              </h2>
              <p className="home-features-section-subtitle">
                {t('homeServicesSubtitle', {
                  defaultValue:
                    'Choose the right services to streamline your operations and stay compliant.',
                })}
              </p>
            </header>
          ) : (
            <motion.header
              className="home-features-section-header"
              initial="hidden"
              whileInView="visible"
              viewport={homeViewport}
              variants={homeHeaderReveal}
            >
              <p className="home-features-section-eyebrow">
                {t('homeServicesEyebrow', { defaultValue: 'SERVICES' })}
              </p>
              <h2 className="home-features-section-title">
                {t('homeServicesTitle', { defaultValue: 'Business Support Solutions' })}
              </h2>
              <p className="home-features-section-subtitle">
                {t('homeServicesSubtitle', {
                  defaultValue:
                    'Choose the right services to streamline your operations and stay compliant.',
                })}
              </p>
            </motion.header>
          )}
          {reduceMotion ? (
            <div className="home-features-card-grid grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
              {features.map((feature, index) => (
                <ListingCardShell key={index} className="home-feature-card-shell">
                  <div className="home-feature-card-border h-full rounded-[16px] md:rounded-[20px]">
                    <div className="home-feature-card-beam-spinner" aria-hidden="true" />
                    <div className="listing-card-glow home-feature-card card-glow-hover p-5 md:p-8 rounded-[14px] md:rounded-[18px] flex flex-col items-center text-center h-full">
                      <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-purple mb-4 md:mb-5">
                        {feature.icon}
                      </div>
                      <h3 className="font-display text-lg md:text-xl font-medium text-gray-900 mb-5 md:mb-6 flex-1">
                        {feature.title}
                      </h3>
                      <GlowButton
                        onClick={feature.onClick ?? (feature.link ? () => navigate(feature.link) : undefined)}
                        disabled={Boolean(feature.comingSoon)}
                      >
                        {t('exploreBtn')} →
                      </GlowButton>
                    </div>
                  </div>
                </ListingCardShell>
              ))}
            </div>
          ) : (
            <motion.div
              className="home-features-card-grid grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={homeViewport}
              variants={homeStaggerContainer}
            >
              {features.map((feature, index) => (
                <motion.div key={index} variants={homeStaggerItem}>
                  <ListingCardShell className="home-feature-card-shell">
                    <motion.div
                      className="home-feature-card-border h-full rounded-[16px] md:rounded-[20px]"
                      whileHover={homeCardHover}
                      whileTap={homeCardTap}
                    >
                      <div className="home-feature-card-beam-spinner" aria-hidden="true" />
                      <div className="listing-card-glow home-feature-card card-glow-hover p-5 md:p-8 rounded-[14px] md:rounded-[18px] flex flex-col items-center text-center h-full">
                        <motion.div
                          className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-purple mb-4 md:mb-5"
                          whileHover={homeFeatureIconHover}
                        >
                          {feature.icon}
                        </motion.div>
                        <h3 className="font-display text-lg md:text-xl font-medium text-gray-900 mb-5 md:mb-6 flex-1">
                          {feature.title}
                        </h3>
                        <GlowButton
                          onClick={feature.onClick ?? (feature.link ? () => navigate(feature.link) : undefined)}
                          disabled={Boolean(feature.comingSoon)}
                        >
                          {t('exploreBtn')} →
                        </GlowButton>
                      </div>
                    </motion.div>
                  </ListingCardShell>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <HomeFooter />

    </div>

  );

}

