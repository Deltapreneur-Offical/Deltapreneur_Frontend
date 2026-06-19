import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { joinUsAPI } from '../api/services';
import TopNavbar from '../components/common/TopNavbar';
import HomeFooter from '../components/common/HomeFooter';
import BackToHomeButton from '../components/common/BackToHomeButton';
import Confetti from '../components/common/Confetti';
import {
  Network, Sparkles, Package, Store, ShieldCheck,
  Smartphone, MessageCircle, Laptop, MapPin, Workflow,
  Bell, MonitorCheck, Rocket, BadgeIndianRupee,
  ChevronDown, Timer, BadgePercent, Check, AlertCircle,
  Loader2
} from 'lucide-react';

const SKILL_ENUM_MAP = {
  'Web Development': 'WEB_DEV',
  'App Development': 'APP_DEV',
  'Data Science & Analytics': 'DATA_SCIENCE',
  'AI & Machine Learning': 'AI_ML',
  'Cybersecurity': 'CYBERSECURITY',
  'Cloud & DevOps': 'CLOUD_DEVOPS',
  'Embedded Systems': 'EMBEDDED_SYSTEMS',
  'VLSI Design': 'VLSI',
  'Signal Processing': 'SIGNAL_PROCESSING',
  'Power Systems': 'POWER_SYSTEMS',
  'Control Systems': 'CONTROL_SYSTEMS',
  'Renewable Energy': 'RENEWABLE_ENERGY',
  'CAD/CAM & Manufacturing': 'CAD_CAM',
  'Robotics & Automation': 'ROBOTICS',
  'Automotive Engineering': 'AUTOMOTIVE',
  'Structural Engineering': 'STRUCTURAL_ENG',
  'Construction Management': 'CONSTRUCTION',
  'Environmental Engineering': 'ENVIRONMENTAL',
  'Biotechnology & Bioinformatics': 'BIOTECH',
  'Food Technology': 'FOOD_TECH',
  'Agricultural Technology': 'AGRI_TECH',
  'Aerospace Engineering': 'AEROSPACE',
  'Marine Engineering': 'MARINE',
  'Petroleum & Chemical Engineering': 'PETROCHEM',
  'IoT & Smart Systems': 'IOT',
};

const JoinForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    whatsapp: '',
    cityPincode: '',
    topSkill: 'WEB_DEV',
    hasEquipment: false
  });
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });
  const [showConfetti, setShowConfetti] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Phone number validation - only digits, max 10 chars
    if (name === 'whatsapp') {
      const digitsOnly = value.replace(/\D/g, '');
      const limited = digitsOnly.slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: limited }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName || formData.fullName.length < 2) {
      newErrors.fullName = t('joinFormErrFullName');
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('joinFormErrEmail');
    }
    if (!formData.whatsapp || formData.whatsapp.length !== 10 || !/^\d{10}$/.test(formData.whatsapp)) {
      newErrors.whatsapp = t('joinFormErrWhatsapp');
    }
    if (!formData.cityPincode || formData.cityPincode.length < 2) {
      newErrors.cityPincode = t('joinFormErrCity');
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitState({ status: 'loading', message: '' });
      
      const requestData = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.whatsapp,
        pinCode: formData.cityPincode,
        skill: formData.topSkill,
        equipment: formData.hasEquipment,
      };
      
      await joinUsAPI.submit(requestData);

      setSubmitState({
        status: 'success',
        message: t('joinFormSuccessMessage')
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 12000);
      setFormData({
        fullName: '',
        email: '',
        whatsapp: '',
        cityPincode: '',
        topSkill: 'WEB_DEV',
        hasEquipment: false
      });
    } catch (error) {
      console.error('Join Us error:', error);
      setSubmitState({
        status: 'error',
        message: t('joinFormErrorMessage')
      });
    }
  };

  const workflowSteps = [
    { icon: Bell, titleKey: 'joinFormStepClaimTitle', descKey: 'joinFormStepClaimDesc', color: '#9440dd' },
    { icon: MapPin, titleKey: 'joinFormStepSetupTitle', descKey: 'joinFormStepSetupDesc', color: '#6366f1' },
    { icon: MonitorCheck, titleKey: 'joinFormStepHandoverTitle', descKey: 'joinFormStepHandoverDesc', color: '#0ea5e9' },
    { icon: BadgeIndianRupee, titleKey: 'joinFormStepEarnTitle', descKey: 'joinFormStepEarnDesc', color: '#10b981' },
  ];

  const faqs = [
    { qKey: 'joinFormFaq1Q', aKey: 'joinFormFaq1A' },
    { qKey: 'joinFormFaq2Q', aKey: 'joinFormFaq2A' },
    { qKey: 'joinFormFaq3Q', aKey: 'joinFormFaq3A' },
    { qKey: 'joinFormFaq4Q', aKey: 'joinFormFaq4A' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <TopNavbar />
      <Confetti show={showConfetti} />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <BackToHomeButton />
          <div className="flex items-center gap-2 text-purple-600 font-bold text-lg">
            <Network size={20} />
            <span>{t('joinFormElite')}</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-10 sm:py-14 md:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-green-100 border border-green-300 rounded-full text-xs sm:text-sm font-semibold text-green-700 mb-5 sm:mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {t('joinFormBadge')}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            {t('joinFormHeroTitle')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-10 md:mb-12 max-w-3xl mx-auto leading-relaxed">
            {t('joinFormHeroDesc')}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-[560px] sm:max-w-2xl mx-auto mb-8 sm:mb-10 md:mb-12">
            <div className="p-3.5 sm:p-6 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center justify-center text-center min-h-[96px] sm:min-h-[120px]">
              <p className="text-2xl sm:text-4xl font-bold font-display text-purple-600 leading-none tabular-nums mb-1.5 sm:mb-2">100%</p>
              <p className="text-[11px] sm:text-sm text-gray-600 font-semibold leading-tight">{t('joinFormStatEarnings')}</p>
            </div>
            <div className="p-3.5 sm:p-6 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center justify-center text-center min-h-[96px] sm:min-h-[120px]">
              <p className="text-2xl sm:text-4xl font-bold font-display text-indigo-600 leading-none tabular-nums mb-1.5 sm:mb-2">48h</p>
              <p className="text-[11px] sm:text-sm text-gray-600 font-semibold leading-tight">{t('joinFormStatOnboarding')}</p>
            </div>
            <div className="p-3.5 sm:p-6 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center justify-center text-center min-h-[96px] sm:min-h-[120px]">
              <p className="text-2xl sm:text-4xl font-bold font-display text-green-600 leading-none tabular-nums mb-1.5 sm:mb-2">{'\u20B90'}</p>
              <p className="text-[11px] sm:text-sm text-gray-600 font-semibold leading-tight">{t('joinFormStatJoiningFee')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 sm:py-14 md:py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Info */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Workflow */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 sm:p-7 lg:p-8">
                <h3 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
                  <Workflow size={20} className="text-purple-600" />
                  {t('joinFormWorkflowTitle')}
                </h3>
                <div className="space-y-4">
                  {workflowSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${step.color}15`, borderWidth: '2px', borderStyle: 'solid', borderColor: `${step.color}30` }}>
                        <step.icon size={18} style={{ color: step.color }} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1" style={{ color: step.color }}>{t(step.titleKey)}</h4>
                        <p className="text-gray-600 text-sm">{t(step.descKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Cards */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 sm:p-7 lg:p-8">
                <h3 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
                  <Sparkles size={20} className="text-purple-600" />
                  {t('joinFormDetailsTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailCard
                    icon={Package}
                    title={t('joinFormDeliverTitle')}
                    items={[t('joinFormDeliver1'), t('joinFormDeliver2'), t('joinFormDeliver3')]}
                  />
                  <DetailCard
                    icon={Store}
                    title={t('joinFormWhoTitle')}
                    items={[t('joinFormWho1'), t('joinFormWho2'), t('joinFormWho3'), t('joinFormWho4')]}
                  />
                  <DetailCard
                    icon={Sparkles}
                    title={t('joinFormEarnTitle')}
                    items={[t('joinFormEarn1'), t('joinFormEarn2'), t('joinFormEarn3')]}
                  />
                  <DetailCard
                    icon={ShieldCheck}
                    title={t('joinFormNeedTitle')}
                    items={[t('joinFormNeed1'), t('joinFormNeed2'), t('joinFormNeed3')]}
                  />
                </div>
              </div>

              {/* FAQ */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 sm:p-7 lg:p-8">
                <h3 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
                  <MessageCircle size={20} className="text-purple-600" />
                  {t('joinFormFaqTitle')}
                </h3>
                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <AccordionItem key={idx} q={t(faq.qKey)} a={t(faq.aKey)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="lg:col-span-1 lg:sticky lg:top-24 self-start">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-5 sm:p-7 lg:p-8">
                <div className="mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('joinFormClaimTitle')}</h3>
                  <p className="text-gray-600 text-sm">{t('joinFormClaimSubtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormFullName')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder={t('joinFormNamePlaceholder')}
                      className={`w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                    />
                    {errors.fullName && <span className="text-xs text-red-500 mt-1 block">{errors.fullName}</span>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormEmail')} <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t('joinFormEmailPlaceholder')}
                      className={`w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                    />
                    {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormWhatsapp')} <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-2">
                      <span className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">+91</span>
                      <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        placeholder={t('joinFormWhatsappPlaceholder')}
                        className={`flex-1 px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.whatsapp ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                      />
                    </div>
                    {errors.whatsapp && <span className="text-xs text-red-500 mt-1 block">{errors.whatsapp}</span>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormCityPincode')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="cityPincode"
                      value={formData.cityPincode}
                      onChange={handleChange}
                      placeholder={t('joinFormCityPlaceholder')}
                      className={`w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.cityPincode ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                    />
                    {errors.cityPincode && <span className="text-xs text-red-500 mt-1 block">{errors.cityPincode}</span>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormTopSkill')} <span className="text-red-500">*</span></label>
                    <select name="topSkill" value={formData.topSkill} onChange={handleChange} className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all">
                      <option value="WEB_DEV">Web Development</option>
                      <option value="APP_DEV">App Development</option>
                      <option value="DATA_SCIENCE">Data Science & Analytics</option>
                      <option value="AI_ML">AI & Machine Learning</option>
                      <option value="CYBERSECURITY">Cybersecurity</option>
                      <option value="CLOUD_DEVOPS">Cloud & DevOps</option>
                      <option value="EMBEDDED_SYSTEMS">Embedded Systems</option>
                      <option value="VLSI">VLSI Design</option>
                      <option value="SIGNAL_PROCESSING">Signal Processing</option>
                      <option value="POWER_SYSTEMS">Power Systems</option>
                      <option value="CONTROL_SYSTEMS">Control Systems</option>
                      <option value="RENEWABLE_ENERGY">Renewable Energy</option>
                      <option value="CAD_CAM">CAD/CAM & Manufacturing</option>
                      <option value="ROBOTICS">Robotics & Automation</option>
                      <option value="AUTOMOTIVE">Automotive Engineering</option>
                      <option value="STRUCTURAL_ENG">Structural Engineering</option>
                      <option value="CONSTRUCTION">Construction Management</option>
                      <option value="ENVIRONMENTAL">Environmental Engineering</option>
                      <option value="BIOTECH">Biotechnology & Bioinformatics</option>
                      <option value="FOOD_TECH">Food Technology</option>
                      <option value="AGRI_TECH">Agricultural Technology</option>
                      <option value="AEROSPACE">Aerospace Engineering</option>
                      <option value="MARINE">Marine Engineering</option>
                      <option value="PETROCHEM">Petroleum & Chemical Engineering</option>
                      <option value="IOT">IoT & Smart Systems</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Laptop size={18} className="text-gray-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('joinFormEquipment')}</p>
                        <p className="text-xs text-gray-600">{t('joinFormEquipmentHint')}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="hasEquipment"
                        checked={formData.hasEquipment}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="btn-glow w-full btn-glow-lg"
                    disabled={submitState.status === 'loading'}
                  >
                    {submitState.status === 'loading' ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>{t('joinFormProcessing')}</span>
                      </>
                    ) : (
                      t('joinFormSubmit')
                    )}
                  </button>

                  {submitState.status === 'success' && (
                    <div className="flex items-start gap-3 p-4 bg-green-100 border border-green-300 rounded-lg">
                      <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-green-900">{t('joinFormTerritoryClaimed')}</p>
                        <p className="text-xs text-green-700 mt-1">{submitState.message}</p>
                      </div>
                    </div>
                  )}

                  {submitState.status === 'error' && (
                    <div className="flex items-start gap-3 p-4 bg-red-100 border border-red-300 rounded-lg">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-900">{t('joinFormError')}</p>
                        <p className="text-xs text-red-700 mt-1">{submitState.message}</p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-center text-gray-500">
                    {t('joinFormFooterNote')}
                  </p>
                </form>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <TrustBadge icon={Timer} text={t('joinFormTrustZeroWait')} />
                <TrustBadge icon={BadgePercent} text={t('joinFormTrust100Cut')} />
                <TrustBadge icon={ShieldCheck} text={t('joinFormTrustNoFee')} />
                <TrustBadge icon={Rocket} text={t('joinFormTrustInstant')} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <HomeFooter />
    </div>
  );
};

const DetailCard = ({ icon: Icon, title, items }) => (
  <div className="card-glow-hover p-5 bg-white rounded-xl border border-gray-200 transition-colors">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <Icon size={18} className="text-purple-600" />
      </div>
      <h4 className="font-bold text-gray-900">{title}</h4>
    </div>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
          <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const AccordionItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
        <span className="font-semibold text-gray-900">{q}</span>
        <ChevronDown size={16} className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm text-gray-600">{a}</p>
        </div>
      )}
    </div>
  );
};

const TrustBadge = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
    <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
      <Icon size={14} className="text-white" />
    </div>
    <p className="text-xs font-semibold text-gray-900">{text}</p>
  </div>
);

export default JoinForm;

