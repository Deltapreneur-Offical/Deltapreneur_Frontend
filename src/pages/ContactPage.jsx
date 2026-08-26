import { useMemo } from 'react';
import { Mail, Phone, MessageCircle, Clock, Send, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import BrandLogoImage from '../components/common/BrandLogoImage';
import HomeFooter from '../components/common/HomeFooter';
import BackToHomeButton from '../components/common/BackToHomeButton';
import {
  PageHero,
  PageHeroItem,
  PageReveal,
  PageStagger,
  PageStaggerItem,
} from '../components/motion/PageMotion';
import { HOME_EASE_OUT } from '../components/motion/motionPresets';
import useDocumentMeta from '../hooks/useDocumentMeta';
import {
  BUSINESS_ADDRESS_LINES,
  BUSINESS_BRAND_NAME,
  BUSINESS_GSTIN,
  BUSINESS_LEGAL_NAME,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_MAILTO,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  WHATSAPP_URL,
} from '../config/contactLinks';

export default function ContactPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useDocumentMeta({
    title: 'Contact Us | HubRegistrar',
    description:
      'Contact Us — HubRegistrar (Aultum International) support email, phone, WhatsApp, and business address in Hubballi, Karnataka, India.',
  });

  const contactInfo = useMemo(
    () => [
      {
        icon: Mail,
        title: 'Email',
        details: SUPPORT_EMAIL,
        link: SUPPORT_EMAIL_MAILTO,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      {
        icon: Phone,
        title: 'Phone',
        details: `+91 ${SUPPORT_PHONE_DISPLAY}`,
        link: SUPPORT_PHONE_TEL,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
      },
      {
        icon: MessageCircle,
        title: 'WhatsApp',
        details: `+91 ${SUPPORT_PHONE_DISPLAY}`,
        link: WHATSAPP_URL,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
    ],
    [],
  );

  const businessHours = useMemo(
    () => [
      { day: t('businessHoursWeekdays'), hours: t('businessHoursWeekdaysTime') },
      { day: t('businessHoursSunday'), hours: t('businessHoursSundayTime') },
    ],
    [t],
  );

  const CtaButtonTag = reduceMotion ? 'button' : motion.button;
  const ctaButtonProps = reduceMotion
    ? {}
    : {
      whileHover: { y: -2, scale: 1.02, transition: { duration: 0.22, ease: HOME_EASE_OUT } },
      whileTap: { scale: 0.98 },
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <BackToHomeButton />
          <BrandLogoImage
            alt="HubRegistrar"
            className="h-10 cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>
      </nav>

      <section className="py-16 px-4 max-md:py-12">
        <PageHero className="max-w-4xl mx-auto text-center">
          <PageHeroItem>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 border border-purple-300 rounded-full text-sm font-semibold text-purple-700 mb-6">
              <Send size={16} />
              Contact Us
            </div>
          </PageHeroItem>
          <PageHeroItem>
            <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 mb-6 max-md:text-4xl">
              Contact Us
            </h1>
          </PageHeroItem>
          <PageHeroItem>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto max-md:text-lg">
              Reach {BUSINESS_BRAND_NAME} ({BUSINESS_LEGAL_NAME}) for support, billing, refunds,
              cancellations, and partnership questions. We respond during business hours.
            </p>
          </PageHeroItem>
        </PageHero>
      </section>

      <section className="px-4 pb-4">
        <PageReveal className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-indigo-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="font-display text-xl font-bold text-gray-900 mb-4">Business contact details</h2>
            <div className="space-y-3 text-sm sm:text-base text-gray-700">
              <p>
                <span className="font-semibold text-gray-900">Company:</span>{' '}
                {BUSINESS_LEGAL_NAME} (operating as {BUSINESS_BRAND_NAME})
              </p>
              <p>
                <span className="font-semibold text-gray-900">Email:</span>{' '}
                <a href={SUPPORT_EMAIL_MAILTO} className="text-indigo-600 hover:underline font-medium">
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p>
                <span className="font-semibold text-gray-900">Phone:</span>{' '}
                <a href={SUPPORT_PHONE_TEL} className="text-indigo-600 hover:underline font-medium">
                  +91 {SUPPORT_PHONE_DISPLAY}
                </a>
              </p>
              <p>
                <span className="font-semibold text-gray-900">GSTIN:</span> {BUSINESS_GSTIN}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-indigo-600 mt-1 shrink-0" />
                <span>
                  <span className="font-semibold text-gray-900">Address:</span>{' '}
                  {BUSINESS_ADDRESS_LINES.join(', ')}
                </span>
              </p>
              <p className="text-gray-500 text-sm pt-1">
                Related policies:{' '}
                <a href="/privacy-policy" className="text-indigo-600 hover:underline">Privacy Policy</a>
                {' · '}
                <a href="/terms-and-conditions" className="text-indigo-600 hover:underline">Terms and Conditions</a>
                {' · '}
                <a href="/refund-policy" className="text-indigo-600 hover:underline">Refund Policy</a>
                {' · '}
                <a href="/cancellation-policy" className="text-indigo-600 hover:underline">Cancellation Policy</a>
              </p>
            </div>
          </div>
        </PageReveal>
      </section>

      <section className="py-12 px-4 max-md:py-8">
        <div className="max-w-6xl mx-auto">
          <PageStagger className="grid grid-cols-1 md:grid-cols-3 gap-6 max-md:gap-4">
            {contactInfo.map((item, index) => {
              const Icon = item.icon;
              const content = (
                <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-xl hover:border-gray-400 flex flex-col items-center text-center h-full max-md:p-6">
                  <div className={`w-16 h-16 ${item.bgColor} rounded-full flex items-center justify-center mb-5 max-md:w-14 max-md:h-14 max-md:mb-4`}>
                    <Icon className={item.color} size={28} strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-3 max-md:text-lg">{item.title}</h3>
                  <p className={`text-base font-semibold ${item.color} max-md:text-sm`}>{item.details}</p>
                </div>
              );

              return (
                <PageStaggerItem key={index} hover>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full"
                    >
                      {content}
                    </a>
                  ) : (
                    content
                  )}
                </PageStaggerItem>
              );
            })}
          </PageStagger>
        </div>
      </section>

      <section className="py-8 px-4 max-md:py-6">
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          <p className="text-sm sm:text-base">
            <span className="font-semibold text-slate-900">Proprietor:</span>{' '}
            Neminath Surendra Akkole
          </p>
        </div>
      </section>

      <section className="py-12 px-4 max-md:py-8">
        <PageReveal className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 max-md:p-6">
            <div className="flex items-center gap-3 mb-6 max-md:mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center max-md:w-10 max-md:h-10">
                <Clock className="text-purple-600" size={24} strokeWidth={2} />
              </div>
              <h2 className="font-display text-2xl font-bold text-gray-900 max-md:text-xl">{t('businessHours')}</h2>
            </div>
            <div className="space-y-4">
              {businessHours.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <span className="text-gray-700 font-medium max-md:text-sm">{item.day}</span>
                  <span className="text-gray-900 font-semibold max-md:text-sm">{item.hours}</span>
                </div>
              ))}
            </div>
          </div>
        </PageReveal>
      </section>

      <section className="py-16 px-4 max-md:py-12">
        <PageReveal className="max-w-4xl mx-auto text-center" delay={0.06}>
          <div className="contact-page-cta bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-12 shadow-2xl max-md:p-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4 max-md:text-2xl">
              {t('readyToGetStarted')}
            </h2>
            <p className="text-purple-100 text-lg mb-8 max-md:text-base max-md:mb-6">
              {t('ctaJoinDescription')}
            </p>
            <div className="flex gap-4 justify-center max-md:flex-col">
              <CtaButtonTag
                type="button"
                className="btn-glow btn-glow-lg contact-page-cta__signin"
                onClick={() => navigate('/login', { state: { showLoginForm: true } })}
                {...ctaButtonProps}
              >
                {t('signIn')}
              </CtaButtonTag>
            </div>
          </div>
        </PageReveal>
      </section>

      <HomeFooter />
    </div>
  );
}
