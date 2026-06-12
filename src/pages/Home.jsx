import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { useTranslation } from 'react-i18next';

import { Headset, ShieldCheck } from 'lucide-react';

import TopNavbar from '../components/common/TopNavbar';

import HomeNavbar from '../components/common/HomeNavbar';

import HeroGlow from '../components/common/HeroGlow';
import ListingCardShell from '../components/listings/ListingCardShell';

import ExploreSection from '../components/common/ExploreSection';


import HomeFooter from '../components/common/HomeFooter';

import GlowButton from '../components/common/GlowButton';



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



  return `https://www.secureserver.net/products/domain-registration/find?plid=600394&domainToCheck=${finalDomain}`;

};



export default function Home() {

  const navigate = useNavigate();
  const { user, hasAccessToken } = useAuth();

  const { t } = useTranslation();

  const [openDropdown, setOpenDropdown] = useState(null);

  const navRef = useRef(null);



  useEffect(() => {

    document.body.classList.add('home-page-body');



    const handleScroll = () => {

      if (navRef.current) {

        if (window.scrollY > 0) {

          navRef.current.classList.add('scrolled');

        } else {

          navRef.current.classList.remove('scrolled');

        }

      }

    };



    window.addEventListener('scroll', handleScroll);



    return () => {

      document.body.classList.remove('home-page-body');

      window.removeEventListener('scroll', handleScroll);

    };

  }, []);



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



  const goToOperations = () => {
    if (user || hasAccessToken) {
      navigate('/operations');
    } else {
      navigate('/login', { state: { from: { pathname: '/operations' } } });
    }
  };

  const features = [
    {
      icon: <Headset className="w-10 h-10 text-gray-900" strokeWidth={1.75} aria-hidden />,
      title: t('homeVirtualAssistanceTitle', { defaultValue: 'Virtual Assistant' }),
      onClick: goToOperations,
    },
    {
      icon: <ShieldCheck className="w-10 h-10 text-gray-900" strokeWidth={1.75} aria-hidden />,
      title: t('homeComplianceTitle', { defaultValue: 'Compliances' }),
      link: '/domains',
    },
  ];



  return (

    <div className="relative min-w-0 bg-white">

      <TopNavbar homeMobileMenu hideContactUs />

      <HomeNavbar

        navRef={navRef}

        openDropdown={openDropdown}

        setOpenDropdown={setOpenDropdown}

        navigate={navigate}

        hideJoinCta

      />



      <div className="home-hero-search-stack relative z-10 overflow-visible">
        <HeroGlow />
      </div>

      <div className="home-hero-align-outer">
        <div className="home-hero-align-inner">
          <ExploreSection />
        </div>
      </div>

      <section className="home-features-section py-12 md:py-20">
        <div className="home-features-section-grid" aria-hidden="true" />
        <div className="home-features-section-content home-hero-align-inner">
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
                  'Choose the right service to streamline operations and stay compliant.',
              })}
            </p>
          </header>
          <div className="home-features-card-grid grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
            {features.map((feature, index) => (
              <ListingCardShell key={index} className="home-feature-card-shell">
                <div className="home-feature-card-border h-full rounded-[16px] md:rounded-[20px]">
                  <div className="home-feature-card-beam-spinner" aria-hidden="true" />
                  <div className="listing-card-glow home-feature-card card-glow-hover p-5 md:p-8 rounded-[14px] md:rounded-[18px] shadow-sm flex flex-col items-center text-center h-full">
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
        </div>
      </section>

      <HomeFooter />

    </div>

  );

}

