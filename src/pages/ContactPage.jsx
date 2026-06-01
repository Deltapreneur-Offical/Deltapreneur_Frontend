import { useMemo } from 'react';
import { Mail, Phone, MessageCircle, Clock, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import coBrotherLogo from '../assets/Cobrother_logo.png';
import HomeFooter from '../components/common/HomeFooter';

export default function ContactPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const contactInfo = useMemo(
    () => [
      {
        icon: Mail,
        title: t('emailUs'),
        details: 'support@cobrother.com',
        link: 'mailto:support@cobrother.com',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      {
        icon: Phone,
        title: t('callUs'),
        details: '+91 98765 43210',
        link: 'tel:+919876543210',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
      },
      {
        icon: MessageCircle,
        title: t('whatsapp'),
        details: '+91 98765 43210',
        link: 'https://wa.me/919876543210',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
    ],
    [t],
  );

  const businessHours = useMemo(
    () => [
      { day: t('businessHoursWeekdays'), hours: t('businessHoursWeekdaysTime') },
      { day: t('businessHoursSunday'), hours: t('businessHoursSundayTime') },
    ],
    [t],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <img
            src={coBrotherLogo}
            alt="CoBrother"
            className="h-10 cursor-pointer"
            onClick={() => navigate('/')}
          />
          <button
            type="button"
            className="btn-glow btn-glow-sm"
            onClick={() => navigate('/')}
          >
            {t('backToHomeLabel')}
          </button>
        </div>
      </nav>

      <section className="py-16 px-4 max-md:py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 border border-purple-300 rounded-full text-sm font-semibold text-purple-700 mb-6">
            <Send size={16} />
            {t('contactHeroBadge')}
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 mb-6 max-md:text-4xl">
            {t('contactHeroTitle')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto max-md:text-lg">
            {t('contactHeroSubtitle')}
          </p>
        </div>
      </section>

      <section className="py-12 px-4 max-md:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-md:gap-4">
            {contactInfo.map((item, index) => {
              const Icon = item.icon;
              const content = (
                <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-gray-400 flex flex-col items-center text-center h-full max-md:p-6">
                  <div className={`w-16 h-16 ${item.bgColor} rounded-full flex items-center justify-center mb-5 max-md:w-14 max-md:h-14 max-md:mb-4`}>
                    <Icon className={item.color} size={28} strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-xl font-bold text-gray-900 mb-3 max-md:text-lg">{item.title}</h3>
                  <p className={`text-base font-semibold ${item.color} max-md:text-sm`}>{item.details}</p>
                </div>
              );

              return item.link ? (
                <a
                  key={index}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {content}
                </a>
              ) : (
                <div key={index}>{content}</div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 max-md:py-8">
        <div className="max-w-4xl mx-auto">
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
        </div>
      </section>

      <section className="py-16 px-4 max-md:py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-12 shadow-2xl max-md:p-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4 max-md:text-2xl">
              {t('readyToGetStarted')}
            </h2>
            <p className="text-purple-100 text-lg mb-8 max-md:text-base max-md:mb-6">
              {t('ctaJoinDescription')}
            </p>
            <div className="flex gap-4 justify-center max-md:flex-col">
              <button
                type="button"
                className="btn-glow"
                onClick={() => navigate('/login')}
              >
                {t('signIn')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
