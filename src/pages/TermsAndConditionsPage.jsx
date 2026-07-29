import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from '../utils/simpleMotion';
import { useNavigate } from 'react-router-dom';
import { FileCheck, FileText, Mail, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import TopNavbar from '../components/common/TopNavbar';
import HomeNavbar from '../components/common/HomeNavbar';
import HomeFooter from '../components/common/HomeFooter';
import BackToHomeButton from '../components/common/BackToHomeButton';
import useHomePageScrollNav from '../hooks/useHomePageScrollNav';

export default function TermsAndConditionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const { isScrolled, navRef } = useHomePageScrollNav();
  const lastUpdated = '18 APRIL 2026';

  const sections = [
    { id: 'acceptance', title: t('termsSection1Title') },
    { id: 'services', title: t('termsSection2Title') },
    { id: 'user-obligations', title: t('termsSection3Title') },
    { id: 'intellectual-property', title: t('termsSection4Title') },
    { id: 'payments', title: t('termsSection5Title') },
    { id: 'confidentiality', title: t('termsSection6Title') },
    { id: 'disclaimers', title: t('termsSection7Title') },
    { id: 'liability', title: t('termsSection8Title') },
    { id: 'termination', title: t('termsSection9Title') },
    { id: 'governing-law', title: t('termsSection10Title') },
    { id: 'changes', title: t('termsSection11Title') },
    { id: 'contact', title: t('termsSection12Title') },
  ];

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
          <motion.div className="absolute -top-24 right-1/4 h-72 sm:h-80 md:h-96 w-72 sm:w-80 md:w-96 rounded-full bg-indigo-300/30 blur-3xl" animate={{ x: [0, -40, 20, 0], y: [0, 20, -20, 0], scale: [1, 1.1, 0.95, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute -bottom-24 left-1/4 h-72 sm:h-80 md:h-96 w-72 sm:w-80 md:w-96 rounded-full bg-sky-300/25 blur-3xl" animate={{ x: [0, 30, -30, 0], y: [0, -20, 20, 0], scale: [1, 1.15, 0.9, 1] }} transition={{ duration: 10, delay: 2, repeat: Infinity, ease: 'easeInOut' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-slate-50/80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="pt-4 sm:pt-6 mb-4 sm:mb-6">
            <BackToHomeButton />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center mb-8 sm:mb-10 md:mb-14 py-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-4 py-2 mb-5 shadow-sm">
              <FileCheck className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-800">{t('termsPageBadge')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 font-display text-slate-900">
              <span className="text-slate-800">{t('termsPageTitleLine1')}</span>{' '}
              <span className="text-indigo-600">{t('termsPageTitleLine2')}</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              {t('termsPageIntro')}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <Clock className="h-4 w-4 text-slate-500" /> {t('termsPageLastUpdated')} <span className="font-medium text-slate-900">{lastUpdated}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <FileText className="h-4 w-4 text-slate-500" /> {t('termsPageReadTime')}
              </span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 mt-4 lg:mt-6">
            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-lg shadow-slate-200/50">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">{t('termsPageOnThisPage')}</h2>
                <ul className="space-y-2">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => scrollTo(s.id)}
                        className="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition"
                      >
                        <span className="truncate text-left">{s.title}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400 opacity-80 group-hover:text-indigo-600 group-hover:opacity-100 transition" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/90 p-3 sm:p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-900/90 leading-relaxed">{t('termsPageReadCarefully')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/40">
                <TermsSection id="acceptance" title={t('termsSection1Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    CoBrother {t('termsSection1Body')}
                  </p>
                </TermsSection>
                <TermsSection id="services" title={t('termsSection2Title')}>
                  <ul className="text-slate-600 text-sm sm:text-base leading-relaxed list-disc pl-5 space-y-2">
                    <li>{t('termsSection2Item1')}</li>
                    <li>{t('termsSection2Item2')}</li>
                    <li>{t('termsSection2Item3')}</li>
                    <li>{t('termsSection2Item4')}</li>
                  </ul>
                </TermsSection>
                <TermsSection id="user-obligations" title={t('termsSection3Title')}>
                  <ul className="text-slate-600 text-sm sm:text-base leading-relaxed list-disc pl-5 space-y-2">
                    <li>{t('termsSection3Item1')}</li>
                    <li>{t('termsSection3Item2')}</li>
                    <li>{t('termsSection3Item3')}</li>
                    <li>{t('termsSection3Item4')}</li>
                  </ul>
                </TermsSection>
                <TermsSection id="intellectual-property" title={t('termsSection4Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    CoBrother {t('termsSection4Body')}
                  </p>
                </TermsSection>
                <TermsSection id="payments" title={t('termsSection5Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{t('termsSection5Body')}</p>
                </TermsSection>
                <TermsSection id="confidentiality" title={t('termsSection6Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{t('termsSection6Body')}</p>
                </TermsSection>
                <TermsSection id="disclaimers" title={t('termsSection7Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{t('termsSection7Body')}</p>
                </TermsSection>
                <TermsSection id="liability" title={t('termsSection8Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{t('termsSection8Body')}</p>
                </TermsSection>
                <TermsSection id="termination" title={t('termsSection9Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{t('termsSection9Body')}</p>
                </TermsSection>
                <TermsSection id="governing-law" title={t('termsSection10Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{t('termsSection10Body')}</p>
                </TermsSection>
                <TermsSection id="changes" title={t('termsSection11Title')}>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{t('termsSection11Body')}</p>
                </TermsSection>
                <TermsSection id="contact" title={t('termsSection12Title')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-sm font-semibold text-slate-900">{t('termsPageSupportContact')}</h3>
                      </div>
                      <p className="text-sm text-slate-600">
                        {t('termsPageEmail')} <span className="font-medium text-slate-900">support@cobrother.com</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {t('termsPagePhone')} <span className="font-medium text-slate-900">+91 80 8575 8575</span>
                      </p>
                    </div>
                  </div>
                </TermsSection>
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

function TermsSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 mt-10 first:mt-0">{title}</h2>
      {children}
      <div className="mt-8 mb-4 border-t border-slate-200" />
    </section>
  );
}
