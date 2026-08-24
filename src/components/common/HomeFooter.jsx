import { Link, useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { useCookieConsent } from '../../context/CookieConsentContext';

import { FaWhatsapp } from 'react-icons/fa';

import BrandNavLogo from './BrandNavLogo';
import { EXTERNAL_LINK_PROPS, WHATSAPP_URL } from '../../config/contactLinks';



const XIcon = () => (

  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5">

    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />

  </svg>

);



const InstagramIcon = () => (

  <svg

    viewBox="0 0 24 24"

    fill="none"

    stroke="currentColor"

    strokeWidth="2"

    strokeLinecap="round"

    strokeLinejoin="round"

    aria-hidden="true"

    className="h-4 w-4 sm:h-5 sm:w-5"

  >

    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />

    <circle cx="12" cy="12" r="4" />

    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />

  </svg>

);



const FacebookIcon = () => (

  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5">

    <path d="M24 12.073C24 5.404 18.629 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />

  </svg>

);



const LinkedinIcon = () => (

  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5">

    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />

  </svg>

);



const YoutubeIcon = () => (

  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5">

    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />

  </svg>

);



const WhatsappIcon = () => (

  <FaWhatsapp className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />

);



const socialRowOne = [

  { id: 'whatsapp', href: WHATSAPP_URL, label: 'WhatsApp', Icon: WhatsappIcon },

  { id: 'facebook', href: 'https://www.facebook.com/share/16vjEWTjHi/', label: 'Facebook', Icon: FacebookIcon },

  { id: 'instagram', href: 'https://www.instagram.com/cobrother__?igsh=bXE3YnR4dDJ6NnVi', label: 'Instagram', Icon: InstagramIcon },

];



const socialRowTwo = [

  { id: 'linkedin', href: 'https://www.linkedin.com/company/co-brother/', label: 'LinkedIn', Icon: LinkedinIcon },

  { id: 'youtube', href: 'https://www.youtube.com/channel/UCPq5njZ3e63myDvzfcoSDEQ', label: 'YouTube', Icon: YoutubeIcon },

  { id: 'x', href: 'https://x.com/CoBrother141506', label: 'X', Icon: XIcon },

];



const socialLinkClass = 'home-footer-social-link';



const SocialLink = ({ href, label, Icon, id }) => (

  <a

    href={href}

    {...EXTERNAL_LINK_PROPS}

    aria-label={label}

    className={`${socialLinkClass} home-footer-social-link--${id}`}

  >

    <Icon />

  </a>

);



const linkClass =

  'block py-1.5 text-sm text-slate-600 no-underline transition-colors duration-300 hover:text-[var(--cobrother-hover-color)] visited:text-slate-600';

const scrollToTop = () => {

  window.scrollTo({ top: 0, behavior: 'smooth' });

};



const ScrollLink = ({ to, children, className }) => {

  const navigate = useNavigate();

  const handleClick = (e) => {

    e.preventDefault();

    navigate(to);

    scrollToTop();

  };

  return (

    <a href={to} onClick={handleClick} className={className}>

      {children}

    </a>

  );

};



const headingClass =

  'mb-2.5 inline-block w-fit border-b border-slate-300/70 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-800 sm:text-xs';



export default function HomeFooter() {

  const { t } = useTranslation();

  const { openPreferences } = useCookieConsent();

  const footerBody = (

    <div className="relative w-full pb-6 pt-10 sm:pb-8 sm:pt-12 md:pt-14">

      <div className="home-footer-grid grid w-full grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 md:grid-cols-4 md:gap-10 md:gap-y-10">

        <div className="home-footer-logo-col flex flex-col items-start justify-start sm:col-span-2 md:col-span-4">

          <Link to="/" className="group mb-4 inline-block" aria-label="HubRegistrar home">
            <BrandNavLogo className="h-12 sm:h-12 md:h-14 w-auto max-w-full" imgClassName="!h-12 sm:!h-12 md:!h-14 !w-auto" />
          </Link>

        </div>



        <div className="home-footer-nav-col md:col-span-1">
          <h3 className={headingClass}>{t('explore')}</h3>
          <nav className="flex flex-col">

            <ScrollLink to="/" className={linkClass}>

              {t('Home')}

            </ScrollLink>

            <ScrollLink to="/virtual-assistant" className={linkClass + ' hidden'}>

              Virtual Assistant

            </ScrollLink>

            <ScrollLink to="/franchise" className={linkClass}>

              Apply for Registry office

            </ScrollLink>

          </nav>

        </div>



        <div className="home-footer-nav-col md:col-span-1">
          <h3 className={headingClass}>{t('Company')}</h3>

          <nav className="flex flex-col">

            <ScrollLink to="/about" className={linkClass}>

              {t('About Us')}

            </ScrollLink>

            <ScrollLink to="/contact" className={linkClass}>

              {t('Contact Us')}

            </ScrollLink>

            <ScrollLink to="/join-form" className={linkClass}>

              {t('joinHubRegistrar', { defaultValue: 'Join Us' })}

            </ScrollLink>

          </nav>

        </div>



        <div className="home-footer-nav-col md:col-span-1">
          <h3 className={headingClass}>{t('legal')}</h3>

          <nav className="flex flex-col">

            <ScrollLink to="/privacy-policy" className={linkClass}>

              {t('Privacy Policy')}

            </ScrollLink>

            <ScrollLink to="/terms-and-conditions" className={linkClass}>

              {t('Terms & Conditions')}

            </ScrollLink>

            <ScrollLink to="/refund-policy" className={linkClass}>

              {t('Refund Policy', { defaultValue: 'Refund Policy' })}

            </ScrollLink>

            <ScrollLink to="/cancellation-policy" className={linkClass}>

              {t('Cancellation Policy', { defaultValue: 'Cancellation Policy' })}

            </ScrollLink>

            <ScrollLink to="/shipping-and-exchange" className={linkClass}>

              {t('Shipping & Exchange', { defaultValue: 'Shipping & Exchange' })}

            </ScrollLink>

            <button type="button" onClick={openPreferences} className={`${linkClass} text-left`}>

              {t('cookieConsentFooterLink')}

            </button>

          </nav>

        </div>



        <div className="home-footer-social-col flex flex-col sm:col-span-2 md:col-span-1">

          <h3 className={headingClass}>{t('Show us some love')}</h3>

          <div className="home-footer-social">

            <div className="home-footer-social-row">

              {socialRowOne.map((social) => (

                <SocialLink key={social.id} {...social} />

              ))}

            </div>

            <div className="home-footer-social-row">

              {socialRowTwo.map((social) => (

                <SocialLink key={social.id} {...social} />

              ))}

            </div>

          </div>

        </div>

      </div>



      <div className="home-footer-copyright mt-10 border-t border-slate-200/45 pt-5 text-left sm:mt-12 sm:pt-6">

        <p className="text-xs text-slate-600 sm:text-sm">

          {t('footerCopyright', {

            year: new Date().getFullYear(),

          })}

        </p>

      </div>

    </div>
  );

  return (

    <footer className="app-chrome-panel home-footer-theme relative mt-auto overflow-hidden text-slate-700">

      <div className="home-hero-align-outer">
        <div className="home-hero-align-inner">{footerBody}</div>
      </div>

    </footer>

  );

}


