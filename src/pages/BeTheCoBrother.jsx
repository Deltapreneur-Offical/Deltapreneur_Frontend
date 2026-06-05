import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Network, Sparkles, Package, Store, Map, ShieldCheck,
  Smartphone, MessageCircle, Laptop, MapPin, Workflow,
  Bell, Settings, MonitorCheck, Rocket, BadgeIndianRupee,
  ChevronRight, HelpCircle, ChevronDown, Timer, BadgePercent,
  Quote, Check, AlertCircle, ArrowLeft
} from 'lucide-react';
import TopNavbar from '../components/common/TopNavbar';
import coBrotherLogo from '../assets/Cobrother_logo.png';
import HomeFooter from '../components/common/HomeFooter';
import { joinUsAPI } from '../api/services';
import Confetti from '../components/common/Confetti';

const SKILL_ENUM_MAP = {
  CRM: 'CRM_SETUP',
  'AI Bots': 'AI_SOCIAL_BOTS',
  'SaaS Setup': 'SAAS_SETUP',
};

/* ─── Accordion Item ──────────────────────── */
const AccordionItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      <button type="button" className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors" onClick={() => setOpen(v => !v)}>
        <span className="font-semibold text-gray-900">{q}</span>
        <ChevronDown size={16} className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0">
          <p className="text-gray-600 text-sm">{a}</p>
        </div>
      )}
    </div>
  );
};

/* ─── Detail Card ─────────────────────────── */
const DetailCard = ({ icon: Icon, title, items }) => (
  <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
        <Icon size={18} className="text-purple-600" />
      </div>
      <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
    </div>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
          <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-1.5 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

/* ─── Trust Badge ─────────────────────────── */
const TrustBadge = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
    <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0"><Icon size={14} className="text-white" /></div>
    <span className="text-xs font-semibold text-gray-900">{text}</span>
  </div>
);

/* ─── Flow Step ───────────────────────────── */
const FlowStep = ({ icon: Icon, title, step, desc, isLast, t }) => (
  <div className="flex gap-4 relative">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0"><Icon size={17} className="text-white" /></div>
      {!isLast && <div className="w-0.5 h-full bg-purple-200 mt-2" />}
    </div>
    <div className="flex-1 pb-6">
      <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">{t('beCoBrotherStepLabel', { step })}</span>
      <h4 className="font-bold text-gray-900 text-lg mt-1 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  </div>
);

/* ─── Page ────────────────────────────────── */
export default function BeTheCoBrother() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    whatsapp: '',
    cityPincode: '',
    topSkill: 'CRM',
    hasEquipment: false,
  });
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const loaderTimer = setTimeout(() => {
      setPageLoading(false);
      setTimeout(() => setPageVisible(true), 50);
    }, 1200);
    return () => clearTimeout(loaderTimer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.btc-custom-dropdown')) {
        setSkillDropdownOpen(false);
      }
    };
    if (skillDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [skillDropdownOpen]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = t('joinFormErrFullName');
    if (!formData.email.trim()) errs.email = t('joinFormErrEmail');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = t('joinFormErrEmail');
    if (formData.whatsapp.trim().length < 10) errs.whatsapp = t('joinFormErrWhatsapp');
    if (!formData.cityPincode.trim()) errs.cityPincode = t('joinFormErrCity');
    return errs;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitState({ status: 'loading', message: '' });
    try {
      const requestData = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.whatsapp,
        pinCode: formData.cityPincode,
        skill: SKILL_ENUM_MAP[formData.topSkill],
        equipment: formData.hasEquipment,
      };

      await joinUsAPI.submit(requestData);

      setSubmitState({ status: 'success', message: t('beCoBrotherSuccessMessage') });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      setFormData({ fullName: '', email: '', whatsapp: '', cityPincode: '', topSkill: 'CRM', hasEquipment: false });
    } catch {
      setSubmitState({ status: 'error', message: t('beCoBrotherSubmitFailed') });
    }
  };

  const detailCards = [
    { icon: Package, titleKey: 'beCoBrotherInstallTitle', itemKeys: ['beCoBrotherInstall1', 'beCoBrotherInstall2', 'beCoBrotherInstall3'] },
    { icon: Store, titleKey: 'beCoBrotherHelpTitle', itemKeys: ['beCoBrotherHelp1', 'beCoBrotherHelp2', 'beCoBrotherHelp3'] },
    { icon: Sparkles, titleKey: 'beCoBrotherGetTitle', itemKeys: ['beCoBrotherGet1', 'beCoBrotherGet2', 'beCoBrotherGet3'] },
    { icon: Map, titleKey: 'beCoBrotherTerritoryTitle', itemKeys: ['beCoBrotherTerritory1', 'beCoBrotherTerritory2', 'beCoBrotherTerritory3'] },
  ];

  const requirements = [
    { icon: Smartphone, textKey: 'beCoBrotherReqPhone' },
    { icon: MessageCircle, textKey: 'beCoBrotherReqComm' },
    { icon: Laptop, textKey: 'beCoBrotherReqLaptop' },
    { icon: MapPin, textKey: 'beCoBrotherReqOnsite' },
  ];

  const flowSteps = [
    { icon: Bell, titleKey: 'beCoBrotherFlowClaim', descKey: 'beCoBrotherFlowClaimDesc', step: '01' },
    { icon: MapPin, titleKey: 'beCoBrotherFlowSetup', descKey: 'beCoBrotherFlowSetupDesc', step: '02' },
    { icon: MonitorCheck, titleKey: 'beCoBrotherFlowHandover', descKey: 'beCoBrotherFlowHandoverDesc', step: '03' },
    { icon: BadgeIndianRupee, titleKey: 'beCoBrotherFlowCommission', descKey: 'beCoBrotherFlowCommissionDesc', step: '04' },
  ];

  const skillOptions = [
    { value: 'CRM', labelKey: 'beCoBrotherSkillCrm' },
    { value: 'AI Bots', labelKey: 'beCoBrotherSkillAiBots' },
    { value: 'SaaS Setup', labelKey: 'beCoBrotherSkillSaas' },
  ];

  const faqs = [
    { qKey: 'joinFormFaq1Q', aKey: 'joinFormFaq1A' },
    { qKey: 'joinFormFaq2Q', aKey: 'joinFormFaq2A' },
    { qKey: 'joinFormFaq3Q', aKey: 'joinFormFaq3A' },
    { qKey: 'joinFormFaq4Q', aKey: 'joinFormFaq4A' },
  ];

  if (pageLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center z-50">
        <div className="text-center">
          <img src={coBrotherLogo} alt="CoBrother" className="w-24 h-24 mx-auto mb-6 animate-pulse" />
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">{t('beCoBrotherLoading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 transition-opacity duration-500 ${pageVisible ? 'opacity-100' : 'opacity-0'}`}>
      <TopNavbar />
      <Confetti show={showConfetti} />
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <img src={coBrotherLogo} alt="CoBrother" className="h-10" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 font-semibold" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> {t('beCoBrotherHome')}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero + Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* LEFT — Hero */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-300 rounded-full text-sm font-semibold text-green-700">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {t('beCoBrotherBadge')}
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900">
              {t('beCoBrotherHeroTitle')}
            </h1>

            <p className="text-xl text-gray-600">
              {t('beCoBrotherHeroDesc')}
            </p>

            <div className="grid grid-cols-3 gap-4">
              {[
                { val: '60%', labelKey: 'beCoBrotherStatCommission' },
                { val: '48h', labelKey: 'beCoBrotherStatOnboarding' },
                { val: '₹0', labelKey: 'beCoBrotherStatJoiningFee' },
              ].map(({ val, labelKey }) => (
                <div key={labelKey} className="p-4 bg-white rounded-xl shadow-md border border-gray-200 text-center">
                  <span className="block text-3xl font-bold font-display text-purple-600 mb-1">{val}</span>
                  <span className="block text-xs text-gray-600 font-semibold uppercase tracking-wider">{t(labelKey)}</span>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white text-center">
              <p className="text-lg font-bold">
                {t('beCoBrotherTagline')}
              </p>
            </div>

            <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {t('beCoBrotherWorkflowTitle')}
              </h3>
              {flowSteps.map((s, i) => (
                <FlowStep key={s.titleKey} icon={s.icon} title={t(s.titleKey)} desc={t(s.descKey)} step={s.step} isLast={i === flowSteps.length - 1} t={t} />
              ))}
            </div>
          </div>

          {/* RIGHT — Form */}
          <div ref={formRef} className="sticky top-24 self-start">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="h-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mb-6" />
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('beCoBrotherClaimTitle')}</h3>
                <p className="text-gray-600 text-sm">{t('beCoBrotherClaimSubtitle')} <span className="text-red-500">*</span> {t('beCoBrotherRequiredHint')}</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormFullName')} <span className="text-red-500">*</span></label>
                  {errors.fullName && <span className="text-xs text-red-500 block mb-1">{errors.fullName}</span>}
                  <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder={t('joinFormNamePlaceholder')} className="w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormEmail')} <span className="text-red-500">*</span></label>
                  {errors.email && <span className="text-xs text-red-500 block mb-1">{errors.email}</span>}
                  <input name="email" value={formData.email} onChange={handleChange} placeholder={t('joinFormEmailPlaceholder')} className="w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormWhatsapp')} <span className="text-red-500">*</span></label>
                  {errors.whatsapp && <span className="text-xs text-red-500 block mb-1">{errors.whatsapp}</span>}
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">+91</span>
                    <input name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder={t('joinFormWhatsappPlaceholder')} className="flex-1 px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormCityPincode')} <span className="text-red-500">*</span></label>
                  {errors.cityPincode && <span className="text-xs text-red-500 block mb-1">{errors.cityPincode}</span>}
                  <input name="cityPincode" value={formData.cityPincode} onChange={handleChange} placeholder={t('beCoBrotherCityPlaceholder')} className="w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('joinFormTopSkill')} <span className="text-red-500">*</span></label>
                  {errors.topSkill && <span className="text-xs text-red-500 block mb-1">{errors.topSkill}</span>}
                  <div className="btc-custom-dropdown relative">
                    <button
                      type="button"
                      className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all flex items-center justify-between"
                      onClick={() => setSkillDropdownOpen(!skillDropdownOpen)}
                    >
                      <span>{t(skillOptions.find(opt => opt.value === formData.topSkill)?.labelKey || '') || t('beCoBrotherSelectSkill')}</span>
                      <ChevronDown size={16} className={`text-gray-600 transition-transform ${skillDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {skillDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {skillOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${formData.topSkill === option.value ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700'}`}
                            onClick={() => {
                              handleChange({ target: { name: 'topSkill', value: option.value } });
                              setSkillDropdownOpen(false);
                            }}
                          >
                            {t(option.labelKey)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      {formData.hasEquipment ? <Laptop size={16} className="text-purple-600" /> : <Smartphone size={16} className="text-purple-600" />}
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-gray-900">{t('joinFormEquipment')}</span>
                      <span className="block text-xs text-gray-600">{t('joinFormEquipmentHint')}</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="hasEquipment" checked={formData.hasEquipment} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-glow btn-glow-lg w-full"
                  disabled={submitState.status === 'loading'}
                >
                  {submitState.status === 'loading' ? t('beCoBrotherSubmitting') : t('beCoBrotherStartEarning')}
                </button>

                {submitState.status === 'success' && (
                  <div className="flex items-start gap-3 p-4 bg-green-100 border border-green-300 rounded-lg">
                    <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-sm font-bold text-green-900 block">{t('joinFormTerritoryClaimed')}</strong>
                      <p className="text-xs text-green-700 mt-1">{submitState.message}</p>
                    </div>
                  </div>
                )}
                {submitState.status === 'error' && (
                  <div className="flex items-start gap-3 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-sm font-bold text-red-900 block">{t('joinFormError')}</strong>
                      <p className="text-xs text-red-700 mt-1">{submitState.message}</p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-center text-gray-500">{t('beCoBrotherNoSpam')}</p>
              </form>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <TrustBadge icon={Timer} text={t('joinFormTrustZeroWait')} />
              <TrustBadge icon={BadgePercent} text={t('beCoBrotherTrust60Cut')} />
              <TrustBadge icon={ShieldCheck} text={t('joinFormTrustNoFee')} />
              <TrustBadge icon={MapPin} text={t('beCoBrotherTrustLocal')} />
            </div>

            {/* Quote */}
            <div className="mt-6 p-5 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl border border-purple-200">
              <Quote size={16} className="text-purple-600 mb-3" />
              <div>
                <p className="text-gray-900 font-semibold mb-2">{t('beCoBrotherQuote')}</p>
                <p className="text-gray-600 text-sm">{t('beCoBrotherQuoteSub')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <section className="mb-20">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0"><Sparkles size={18} className="text-purple-600" /></div>
            <div>
              <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">{t('beCoBrotherDetailsBadge')}</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-1 mb-2">{t('beCoBrotherDetailsTitle')}</h2>
              <p className="text-gray-600">{t('beCoBrotherDetailsSubtitle')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {detailCards.map(c => (
              <DetailCard
                key={c.titleKey}
                icon={c.icon}
                title={t(c.titleKey)}
                items={c.itemKeys.map(k => t(k))}
              />
            ))}
          </div>

          <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><ShieldCheck size={17} /></div>
              <h4 className="text-xl font-bold">{t('beCoBrotherRequirements')}</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requirements.map(r => (
                <div key={r.textKey} className="flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0"><r.icon size={14} /></div>
                  <span className="text-sm font-semibold">{t(r.textKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0"><HelpCircle size={18} className="text-indigo-600" /></div>
            <div>
              <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">{t('beCoBrotherFaqBadge')}</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-1 mb-2">{t('beCoBrotherFaqTitle')}</h2>
              <p className="text-gray-600">{t('beCoBrotherFaqSubtitle')}</p>
            </div>
          </div>
          <div className="max-w-3xl">
            {faqs.map(f => <AccordionItem key={f.qKey} q={t(f.qKey)} a={t(f.aKey)} />)}
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
