import { useState } from 'react';
import { motion } from '../../utils/simpleMotion';
import { useNavigate } from 'react-router-dom';
import { FileText, Mail, Clock, ChevronRight, MapPin, Phone } from 'lucide-react';
import TopNavbar from './TopNavbar';
import HomeNavbar from './HomeNavbar';
import HomeFooter from './HomeFooter';
import BackToHomeButton from './BackToHomeButton';
import useHomePageScrollNav from '../../hooks/useHomePageScrollNav';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import {
  BUSINESS_ADDRESS_LINES,
  BUSINESS_BRAND_NAME,
  BUSINESS_GSTIN,
  BUSINESS_LEGAL_NAME,
  GRIEVANCE_ACKNOWLEDGMENT_HOURS,
  GRIEVANCE_OFFICER_TITLE,
  GRIEVANCE_RESOLUTION_DAYS,
  SUPPORT_BUSINESS_HOURS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
} from '../../config/contactLinks';

/** Shared chrome matching PrivacyPolicyPage / TermsAndConditionsPage. */
export default function LegalPolicyShell({
  badgeIcon: BadgeIcon = FileText,
  badge,
  titleLead = 'Deltapreneur',
  titleAccent,
  intro,
  lastUpdated,
  readTime = 'Read time: ~4 minutes',
  sections = [],
  documentTitle,
  documentDescription,
  children,
}) {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const { isScrolled, navRef } = useHomePageScrollNav();

  const resolvedTitle = documentTitle || `${titleLead} ${titleAccent} | Deltapreneur`.replace(/\s+/g, ' ').trim();
  useDocumentMeta({
    title: resolvedTitle,
    description: documentDescription || intro,
  });

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <TopNavbar homeMobileMenu isScrolled={isScrolled} />
      <HomeNavbar
        navRef={navRef}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        navigate={navigate}
        isScrolled={isScrolled}
      />

      <section className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-24 left-1/4 h-72 sm:h-80 md:h-96 w-72 sm:w-80 md:w-96 rounded-full bg-indigo-300/30 blur-3xl"
            animate={{ x: [0, 40, -20, 0], y: [0, -20, 20, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-24 right-1/4 h-72 sm:h-80 md:h-96 w-72 sm:w-80 md:w-96 rounded-full bg-sky-300/25 blur-3xl"
            animate={{ x: [0, -30, 30, 0], y: [0, 20, -20, 0], scale: [1, 1.15, 0.9, 1] }}
            transition={{ duration: 10, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-slate-50/80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="pt-4 sm:pt-6 mb-4 sm:mb-6">
            <BackToHomeButton />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center mb-4 sm:mb-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-4 py-2 mb-5 shadow-sm">
              <BadgeIcon className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-800">{badge}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 font-display text-slate-900">
              <span className="text-slate-800">{titleLead} </span>
              <span className="text-indigo-600">{titleAccent}</span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              {intro}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <Clock className="h-4 w-4 text-slate-500" /> Last updated:{' '}
                <span className="font-medium text-slate-900">{lastUpdated}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <FileText className="h-4 w-4 text-slate-500" /> {readTime}
              </span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 mt-4 lg:mt-6">
            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-lg shadow-slate-200/50">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">On this page</h2>
                <ul className="space-y-2">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => scrollTo(s.id)}
                        className="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition"
                      >
                        <span className="truncate">{s.title}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400 opacity-80 group-hover:text-indigo-600 group-hover:opacity-100 transition" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/40">
                {children}
              </div>
              <div className="h-10" />
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}

export function PolicySection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 mt-10 first:mt-0">{title}</h2>
      {children}
      <div className="mt-8 mb-4 border-t border-slate-200" />
    </section>
  );
}

export function PolicyContactCard() {
  return (
    <div className="grid grid-cols-1 gap-4 mt-2">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            {BUSINESS_BRAND_NAME} Support ({BUSINESS_LEGAL_NAME})
          </h3>
        </div>
        <p className="text-sm text-slate-600">
          Email:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-slate-900 hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-sm text-slate-600 mt-1 inline-flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-indigo-600" />
          Phone: <span className="font-medium text-slate-900">+91 {SUPPORT_PHONE_DISPLAY}</span>
        </p>
        <p className="text-sm text-slate-600 mt-2 flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-indigo-600 mt-0.5 shrink-0" />
          <span>
            Address:{' '}
            <span className="font-medium text-slate-900">{BUSINESS_ADDRESS_LINES.join(', ')}</span>
          </span>
        </p>
        <p className="text-sm text-slate-600 mt-2">
          GSTIN: <span className="font-medium text-slate-900">{BUSINESS_GSTIN}</span>
        </p>
        <p className="text-sm text-slate-600 mt-2">
          Business hours: <span className="font-medium text-slate-900">{SUPPORT_BUSINESS_HOURS}</span>
        </p>
        <p className="text-sm text-slate-600 mt-2">
          Contact page:{' '}
          <a href="/contact" className="font-medium text-indigo-600 hover:underline">
            https://www.deltapreneur.com/contact
          </a>
        </p>
      </div>
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">{GRIEVANCE_OFFICER_TITLE}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          In line with the Consumer Protection (E-Commerce) Rules, 2020, {BUSINESS_LEGAL_NAME} has appointed a{' '}
          {GRIEVANCE_OFFICER_TITLE}. For complaints about orders, refunds, or cancellations, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-slate-900 hover:underline">
            {SUPPORT_EMAIL}
          </a>{' '}
          or call +91 {SUPPORT_PHONE_DISPLAY}. We acknowledge grievances within{' '}
          {GRIEVANCE_ACKNOWLEDGMENT_HOURS} hours and aim to resolve them within {GRIEVANCE_RESOLUTION_DAYS} days.
        </p>
      </div>
    </div>
  );
}
