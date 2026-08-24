import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Building2, GraduationCap, Monitor, Megaphone, Users, FileText, MapPin, Briefcase, AlertCircle, Send, ArrowRight, ExternalLink, Info } from 'lucide-react';
import { operationsAPI, franchiseApplicationAPI } from '../api/services';
import '../styles/franchise-page.css';

import {

  PageHero, PageHeroItem, PageReveal, PageStagger, PageStaggerItem,

} from '../components/motion/PageMotion';

import { HOME_EASE_OUT } from '../components/motion/motionPresets';

import Confetti from '../components/common/Confetti';
import BrandNavLogo from '../components/common/BrandNavLogo';
import BrandLogoImage from '../components/common/BrandLogoImage';

import BackToHomeButton from '../components/common/BackToHomeButton';

import HomeFooter from '../components/common/HomeFooter';

const BENEFITS = [
  { icon: Building2, label: 'HubRegistrar Branding', desc: 'Operate under a trusted brand name' },
  { icon: GraduationCap, label: 'Training', desc: 'Complete training on processes & tools' },
  { icon: Monitor, label: 'Software / Dashboard', desc: 'Access to dashboard & management tools' },
  { icon: Megaphone, label: 'Marketing Support', desc: 'Marketing materials & guidance' },
  { icon: Users, label: 'Leads / Customer Opportunities', desc: 'Access to customer leads in your area' },
  { icon: FileText, label: 'Documents & Process Support', desc: 'Complete documentation & process help' },
  { icon: MapPin, label: 'Office Setup Guidance', desc: 'Step-by-step office setup assistance' },
  { icon: Briefcase, label: 'Business / Process Support', desc: 'Ongoing business & process support' },
];

const BUSINESS_TYPES = ['Individual', 'Partnership', 'Private Ltd', 'LLP', 'Other'];
const OFFICE_AVAILABILITY = ['Yes', 'No', 'Planning to set up'];

const EMPTY_FORM = {
  full_name: '', mobile_number: '', email: '', city: '', state: '', full_address: '',
  existing_business_name: '', business_type: '', preferred_location: '',
  existing_office_availability: '', relevant_experience: '', reason_for_applying: '', additional_information: '',
  map_url: '',
};

export default function FranchisePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const reduceMotion = useReducedMotion();

  const CtaButtonTag = reduceMotion ? 'button' : motion.button;
  const ctaButtonProps = reduceMotion ? {} : {
    whileHover: { y: -2, scale: 1.02, transition: { duration: 0.22, ease: HOME_EASE_OUT } },
    whileTap: { scale: 0.98 },
  };

  useEffect(() => {
    operationsAPI.list({ serviceType: 'compliance' }).then(({ data }) => { if (data?.success) setServices(data.data || []); }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.mobile_number.trim() || form.mobile_number.trim().length < 10) errs.mobile_number = 'Valid mobile number is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.state.trim()) errs.state = 'State is required';
    if (!form.full_address.trim()) errs.full_address = 'Full address is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await franchiseApplicationAPI.submit(form);
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Submission failed. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="franchise-page">
        <Confetti show={true} />
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors cursor-pointer bg-transparent border-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <BrandNavLogo className="cursor-pointer" onClick={() => navigate('/')} />
          </div>
        </nav>
        <div className="franchise-success">
          <div className="franchise-success-check">
            <CheckCircle size={56} />
          </div>
          <h1 className="franchise-success-title">Thank You for Your Interest!</h1>
          <p className="franchise-success-text">
            Your franchise application has been submitted successfully. Our team will review it and get back to you shortly.
          </p>
          <div className="franchise-success-actions">
            <button onClick={() => navigate('/')} className="franchise-btn-primary">Back to Home</button>
            <a href="/operations" className="franchise-success-explore-btn">
              Explore HubRegistrar Services <ArrowRight size={16} />
            </a>
          </div>
          <div className="franchise-success-explore">
            <p className="franchise-success-explore-title">While you wait, explore our services:</p>
            <div className="franchise-success-explore-grid">
              <a href="/operations" className="franchise-success-explore-card">
                <Briefcase size={20} />
                <span>HubRegistrar Services</span>
              </a>
              <a href="/contact" className="franchise-success-explore-card">
                <FileText size={20} />
                <span>Contact Us</span>
              </a>
              <a href="/domains" className="franchise-success-explore-card">
                <Monitor size={20} />
                <span>Domain Register</span>
              </a>
              <a href="/ventures" className="franchise-success-explore-card">
                <Building2 size={20} />
                <span>Ventures</span>
              </a>
            </div>
          </div>
        </div>
        <HomeFooter />
      </div>
    );
  }

  return (
    <div className="franchise-page">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors cursor-pointer bg-transparent border-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <BrandNavLogo className="cursor-pointer" onClick={() => navigate('/')} />
        </div>
      </nav>

      <section className="franchise-hero">
        <PageHero className="franchise-hero-content">
          <PageHeroItem>
            <span className="franchise-hero-badge">Limited Offer</span>
          </PageHeroItem>
          <PageHeroItem>
            <h1 className="franchise-hero-title"><span className="text-amber-600">₹0</span> Franchise Fee</h1>
          </PageHeroItem>
          <PageHeroItem>
            <p className="franchise-hero-subtitle">Join HubRegistrar as a certified franchise partner. Build your business with a trusted brand, complete support, and access to customer leads. Operating area: approximately 25-50 km per franchise, subject to availability.</p>
          </PageHeroItem>
          <PageHeroItem>
            <CtaButtonTag className="franchise-btn-primary" {...ctaButtonProps}>Apply Now <ArrowRight size={18} /></CtaButtonTag>
          </PageHeroItem>
        </PageHero>
      </section>

      <section className="franchise-section">
        <div className="franchise-container">
          <PageReveal>
            <h2 className="franchise-section-title">What You Get</h2>
          </PageReveal>
          <PageStagger className="franchise-benefits-grid">
            {BENEFITS.map((b, i) => (
              <PageStaggerItem key={i} hover>
                <div className="franchise-benefit-card">
                  <b.icon size={28} className="franchise-benefit-icon" />
                  <h3 className="franchise-benefit-label">{b.label}</h3>
                  <p className="franchise-benefit-desc">{b.desc}</p>
                </div>
              </PageStaggerItem>
            ))}
          </PageStagger>
        </div>
      </section>

      {services.length > 0 && (
        <section className="franchise-section franchise-section-alt">
          <div className="franchise-container">
            <PageReveal>
              <h2 className="franchise-section-title">HubRegistrar Services</h2>
              <p className="franchise-section-subtitle">These are the services you will be able to offer as a HubRegistrar franchise partner.</p>
            </PageReveal>
            <PageStagger className="franchise-services-grid">
              {services.map((service) => (
                <PageStaggerItem key={service.id} hover>
                  <div className="franchise-service-card">
                    <h3 className="franchise-service-name">{service.name}</h3>
                    <p className="franchise-service-desc">{service.description || "Professional registration & compliance service"}</p>
                  </div>
                </PageStaggerItem>
              ))}
            </PageStagger>
          </div>
        </section>
      )}





      <section className="franchise-section" id="apply-form">
        <div className="franchise-container">
          <h2 className="franchise-section-title">Apply for Franchise</h2>
          <p className="franchise-section-subtitle">Fill out the form below to apply. Our team will review your application and contact you.</p>
          {errors.submit && <div className="franchise-error-banner">{errors.submit}</div>}
          <form onSubmit={handleSubmit} className="franchise-form">
            <div className="franchise-form-grid">
              <div className="franchise-field">
                <label>Full Name *</label>
                <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Enter full name" />
                {errors.full_name && <span className="franchise-field-error">{errors.full_name}</span>}
              </div>
              <div className="franchise-field">
                <label>Mobile Number *</label>
                <input name="mobile_number" value={form.mobile_number} onChange={handleChange} placeholder="10-digit mobile number" pattern="[0-9]{10}" maxLength={10} />
                {errors.mobile_number && <span className="franchise-field-error">{errors.mobile_number}</span>}
              </div>
              <div className="franchise-field">
                <label>Email *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
                {errors.email && <span className="franchise-field-error">{errors.email}</span>}
              </div>
              <div className="franchise-field">
                <label>City *</label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="Enter city" />
                {errors.city && <span className="franchise-field-error">{errors.city}</span>}
              </div>
              <div className="franchise-field">
                <label>State *</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="Enter state" />
                {errors.state && <span className="franchise-field-error">{errors.state}</span>}
              </div>
              <div className="franchise-field">
                <label>Existing Business / Shop Name</label>
                <input name="existing_business_name" value={form.existing_business_name} onChange={handleChange} placeholder="Business or shop name (if any)" />
              </div>
              <div className="franchise-field">
                <label>Business Type</label>
                <select name="business_type" value={form.business_type} onChange={handleChange}>
                  <option value="">Select business type</option>
                  {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div className="franchise-field">
                <label>Preferred Location</label>
                <input name="preferred_location" value={form.preferred_location} onChange={handleChange} placeholder="Preferred area / location" />
              </div>
              <div className="franchise-field">
                <label>Existing Office/Shop Availability</label>
                <select name="existing_office_availability" value={form.existing_office_availability} onChange={handleChange}>
                  <option value="">Select option</option>
                  {OFFICE_AVAILABILITY.map((oa) => <option key={oa} value={oa}>{oa}</option>)}
                </select>
              </div>
              <div className="franchise-field franchise-field-full">
                <label>Full Address *</label>
                <textarea name="full_address" value={form.full_address} onChange={handleChange} placeholder="Enter complete address" rows={3} />
                {errors.full_address && <span className="franchise-field-error">{errors.full_address}</span>}
              </div>
              <div className="franchise-field franchise-field-full">
                <label className="franchise-label-with-icon">
                  Premises Location on Map
                  <span className="franchise-map-tooltip-wrapper">
                    <Info size={14} className="franchise-map-info-icon" />
                    <span className="franchise-map-tooltip">
                      Open Google Maps → find your shop/office location → click Share → copy link → paste below
                    </span>
                  </span>
                </label>
                <input
                  name="map_url"
                  value={form.map_url}
                  onChange={handleChange}
                  placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/..."
                  className="franchise-map-input"
                />
                {form.map_url && form.map_url.includes('maps') && (
                  <div className="franchise-map-preview">
                    <iframe
                      title="Location Preview"
                      width="100%"
                      height="300"
                      style={{ border: 0, borderRadius: '8px' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={(() => {
                          const url = form.map_url;
                          if (url.includes('google.com/maps')) return url.replace('maps?', 'maps/embed?');
                          if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps'))
                            return 'https://maps.google.com/maps?q=' + encodeURIComponent(url) + '&z=15&output=embed';
                          if (url.includes('@') && url.includes(',')) {
                            const c = url.match(/@([\d.-]+),([\d.-]+)/);
                            if (c) return 'https://maps.google.com/maps?q=' + c[1] + ',' + c[2] + '&z=15&output=embed';
                          }
                          return 'https://maps.google.com/maps?q=' + encodeURIComponent(url) + '&z=15&output=embed';
                        })()}
                    />
                    <a href={form.map_url} target="_blank" rel="noopener noreferrer" className="franchise-map-link">
                      <ExternalLink size={14} /> Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
              <div className="franchise-field franchise-field-full">
                <label>Relevant Experience</label>
                <textarea name="relevant_experience" value={form.relevant_experience} onChange={handleChange} placeholder="Describe any relevant business experience" rows={3} />
              </div>
              <div className="franchise-field franchise-field-full">
                <label>Reason for Applying</label>
                <textarea name="reason_for_applying" value={form.reason_for_applying} onChange={handleChange} placeholder="Why do you want to become a HubRegistrar franchise partner?" rows={3} />
              </div>
              <div className="franchise-field franchise-field-full">
                <label>Additional Information</label>
                <textarea name="additional_information" value={form.additional_information} onChange={handleChange} placeholder="Any additional information you would like to share" rows={3} />
              </div>
            </div>
            <button type="submit" className="franchise-btn-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}{!submitting && <Send size={16} />}
            </button>
          </form>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
