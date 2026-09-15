import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { virtualAssistantAPI } from '../api/services';
import { readApiError } from '../utils/apiError';
import { validateLinkedInProfileUrl } from '../utils/linkedInProfileUrl';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { convertForeignToInr, convertPrice, formatCurrency } from '../utils/currencyDisplay';
import TopNavbar from '../components/common/TopNavbar';
import HomeNavbar from '../components/common/HomeNavbar';
import HomeFooter from '../components/common/HomeFooter';
import BackToHomeButton from '../components/common/BackToHomeButton';
import Confetti from '../components/common/Confetti';
import BotProtectionFields from '../components/common/BotProtectionFields';
import CurrencyPriceInput from '../components/common/CurrencyPriceInput';
import { useBotProtection } from '../hooks/useBotProtection';
import useHomePageScrollNav from '../hooks/useHomePageScrollNav';
import {
  PageHero,
  PageHeroItem,
  PageReveal,
} from '../components/motion/PageMotion';
import {
  User, Mail, MapPin, Camera, ShieldCheck,
  Briefcase, Globe, Clock,
  Check, AlertCircle, Loader2
} from 'lucide-react';
import VaRolePicker from '../components/virtual-assistant/VaRolePicker';
import { resolveVaApplicationRole, VA_ROLE_OTHER } from '../constants/virtualAssistantRoles';
import '../styles/virtual-assistant-application.css';

const inputErrorClass = (hasError) => (hasError ? ' va-app-input--error' : '');
const selectErrorClass = (hasError) => (hasError ? ' va-app-select--error' : '');
const textareaErrorClass = (hasError) => (hasError ? ' va-app-textarea--error' : '');

const VirtualAssistantPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  } = useBotProtection({ active: true, action: 'virtual-assistant' });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    location: '',
    isAdult: false,
    bio: '',
    roles: [],
    customRole: '',
    skills: '',
    yearsOfExperience: '',
    languages: '',
    linkedinUrl: '',
    portfolioUrl: '',
    resumeUrl: '',
    availability: '',
    hoursPerWeek: '',
    expectedCompensationAmount: '',
    expectedCompensationCurrency: 'INR',
    infoAccurate: false,
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '', data: null });
  const [showConfetti, setShowConfetti] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const { isScrolled, navRef } = useHomePageScrollNav();
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const profilePhotoRef = useRef(null);
  const { user, hasAccessToken } = useAuth();
  const { convertToInr, ratesMeta } = useCurrency();

  useEffect(() => {
    if (user?.email && hasAccessToken) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user, hasAccessToken]);

  const bioCharCount = formData.bio ? formData.bio.trim().length : 0;

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      if (name === 'profilePhoto') {
        const file = files[0];
        if (file) {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            setErrors(prev => ({ ...prev, profilePhoto: 'Only JPG, PNG, or WEBP images are allowed' }));
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, profilePhoto: 'Image must be under 5MB' }));
            return;
          }
          setErrors(prev => ({ ...prev, profilePhoto: null }));
          setProfilePhotoPreview(URL.createObjectURL(file));
        }
      }
      return;
    }
    if (name === 'bio') {
      if (value.trim().length >= 100 && errors.bio) {
        setErrors(prev => ({ ...prev, bio: null }));
      }
    }
    if (name === 'availability' && value) {
      if (errors.availability) {
        setErrors(prev => ({ ...prev, availability: null }));
      }
    }
    if (name === 'linkedinUrl' && errors.linkedinUrl) {
      setErrors(prev => ({ ...prev, linkedinUrl: validateLinkedInProfileUrl(value) }));
    }
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.phoneNumber || !/^\d{10,15}$/.test(formData.phoneNumber.replace(/[\s\-]/g, ''))) {
      newErrors.phoneNumber = 'Enter a valid phone number';
    }
    if (!formData.location || formData.location.trim().length < 2) {
      newErrors.location = 'Location is required';
    }
    if (!formData.bio || formData.bio.trim().length < 100) {
      newErrors.bio = 'Please provide a short bio (at least 100 characters)';
    }
    if (!formData.availability) {
      newErrors.availability = 'Please select your availability';
    }
    const roleResult = resolveVaApplicationRole(formData.roles[0], formData.customRole);
    if (roleResult.error) {
      if (formData.roles[0] === VA_ROLE_OTHER) {
        newErrors.customRole = roleResult.error;
      } else {
        newErrors.roles = roleResult.error;
      }
    }
    if (!formData.skills || formData.skills.trim().length < 2) {
      newErrors.skills = 'Please list your skills';
    }
    if (!formData.yearsOfExperience) {
      newErrors.yearsOfExperience = 'Please select your years of experience';
    }
    if (!formData.languages || formData.languages.trim().length < 2) {
      newErrors.languages = 'Please enter languages known';
    }
    const linkedinError = validateLinkedInProfileUrl(formData.linkedinUrl);
    if (linkedinError) {
      newErrors.linkedinUrl = linkedinError;
    }
    if (!formData.hoursPerWeek) {
      newErrors.hoursPerWeek = 'Please specify hours available per week';
    }
    if (!formData.expectedCompensationAmount || Number(formData.expectedCompensationAmount) <= 0) {
      newErrors.expectedCompensation = 'Please enter your expected compensation';
    }
    if (!formData.isAdult) {
      newErrors.isAdult = 'You must confirm that you are 18 or older';
    }
    if (!formData.infoAccurate) {
      newErrors.infoAccurate = 'Please confirm that all information provided is accurate';
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Privacy Policy and Terms of Service';
    }
    const profilePhotoFile = profilePhotoRef.current?.files?.[0];
    if (!profilePhotoFile) {
      newErrors.profilePhoto = 'Profile photo is required';
    }
    const resumeLink = (formData.resumeUrl || '').trim();
    if (!resumeLink) {
      newErrors.resumeUrl = 'Resume link is required';
    } else if (!/^https?:\/\//i.test(resumeLink)) {
      newErrors.resumeUrl = 'Enter a valid URL starting with http:// or https://';
    }
    return newErrors;
  };

  const handleCompensationCurrencyChange = (nextCurrency) => {
    const oldCurrency = formData.expectedCompensationCurrency || 'INR';
    const currentAmount = Number(formData.expectedCompensationAmount);
    setFormData((prev) => ({ ...prev, expectedCompensationCurrency: nextCurrency }));
    if (oldCurrency === nextCurrency || !Number.isFinite(currentAmount) || currentAmount <= 0) return;
    const inr = oldCurrency === 'INR' ? currentAmount : convertToInr(currentAmount, oldCurrency);
    const converted = convertPrice(inr, nextCurrency, ratesMeta);
    if (converted != null && Number.isFinite(converted)) {
      setFormData((prev) => ({ ...prev, expectedCompensationAmount: String(Math.round(converted * 100) / 100) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitState({ status: 'loading', message: '', data: null });

      const submitData = new FormData();
      submitData.append('full_name', formData.fullName.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('phone_number', formData.phoneNumber.trim());
      submitData.append('location', formData.location.trim());
      submitData.append('is_adult', String(formData.isAdult));
      submitData.append('bio', formData.bio.trim());
      const roleResult = resolveVaApplicationRole(formData.roles[0], formData.customRole);
      if (roleResult.error || !roleResult.role) {
        setErrors((prev) => ({
          ...prev,
          ...(formData.roles[0] === VA_ROLE_OTHER
            ? { customRole: roleResult.error }
            : { roles: roleResult.error }),
        }));
        setSubmitState({ status: 'idle', message: '', data: null });
        return;
      }
      submitData.append('roles', roleResult.role);
      submitData.append('skills', formData.skills.trim());
      submitData.append('years_of_experience', formData.yearsOfExperience.trim());
      submitData.append('languages', formData.languages.trim());
      submitData.append('linkedin_url', formData.linkedinUrl.trim());
      submitData.append('portfolio_url', formData.portfolioUrl.trim());
      submitData.append('availability', formData.availability);
      submitData.append('hours_per_week', formData.hoursPerWeek);
      const compensationValue = formData.expectedCompensationAmount;
      if (compensationValue) {
        const formattedCompensation = formatCurrency(compensationValue, formData.expectedCompensationCurrency);
        submitData.append('expected_compensation', formattedCompensation);
      }
      submitData.append('info_accurate', String(formData.infoAccurate));
      submitData.append('agree_terms', String(formData.agreeTerms));

      const protection = getProtectionPayload();
      if (requiresTurnstile && !protection.turnstileToken) {
        setErrors(prev => ({ ...prev, turnstile: 'Security verification is required. Please refresh and try again.' }));
        return;
      }
      if (protection.turnstileToken) {
        submitData.append('turnstile_token', protection.turnstileToken);
      }
      if (protection.website) {
        submitData.append('website', protection.website);
      }

      const profilePhotoFile = profilePhotoRef.current?.files?.[0];
      if (profilePhotoFile) submitData.append('profile_photo', profilePhotoFile);
      submitData.append('resume_url', formData.resumeUrl.trim());

      const response = await virtualAssistantAPI.submit(submitData);
      const referenceNumber = response.data?.data?.referenceNumber || response.data?.referenceNumber;
      const successMessage = response.data?.message || 'Application submitted successfully';

      setSubmitState({
        status: 'success',
        message: successMessage,
        data: response.data,
      });
      setShowConfetti(true);
      resetProtection();
      setTimeout(() => {
        setShowConfetti(false);
        navigate(`/virtual-assistant/success?ref=${encodeURIComponent(referenceNumber || '')}`);
      }, 1500);
    } catch (error) {
      console.error('Virtual Assistant application error:', error);
      setSubmitState({
        status: 'error',
        message: readApiError(error, 'Something went wrong. Please try again later.'),
        data: null,
      });
    }
  };

  return (
    <div className="va-app-page">
      <div className="va-app-page__glow va-app-page__glow--top" aria-hidden />
      <div className="va-app-page__glow va-app-page__glow--bottom" aria-hidden />
      <TopNavbar homeMobileMenu isScrolled={isScrolled} />
      <HomeNavbar
        navRef={navRef}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        navigate={navigate}
        isScrolled={isScrolled}
      />
      <Confetti show={showConfetti} />

      <div className="va-app-back-row max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <BackToHomeButton />
      </div>

      <PageHero className="va-app-hero max-w-4xl mx-auto text-center pt-4 sm:pt-6 pb-4 sm:pb-8 px-4">
        <PageHeroItem>
          <div className="va-app-badge">
            <span className="va-app-badge__dot" aria-hidden />
            We're hiring DeltaOperators
          </div>
        </PageHeroItem>
        <PageHeroItem>
          <h1 className="va-app-hero-title">
            Become a DeltaOperator
          </h1>
        </PageHeroItem>
        <PageHeroItem>
          <p className="va-app-hero-subtitle mb-8 sm:mb-10 md:mb-12">
            Join Deltapreneur as a DeltaOperator and help businesses thrive with your skills. Work flexibly, earn competitively, and grow with us.
          </p>
        </PageHeroItem>
      </PageHero>

      <section className="va-app-form-section px-4">
        <div className="max-w-3xl mx-auto">
          <PageReveal>
            <div className="va-app-form-card">
              <form onSubmit={handleSubmit} className="va-app-form">
                {/* Section 1 - Personal Information */}
                <div className="va-app-section">
                  <div className="va-app-section-header">
                    <span className="va-app-section-icon">
                      <User size={20} />
                    </span>
                    <h3 className="va-app-section-title">Personal Information</h3>
                  </div>
                  <div className="va-app-section-body">
                    <div className="va-app-field">
                      <label className="va-app-label">Full Name <span className="va-app-required">*</span></label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className={`va-app-input${inputErrorClass(errors.fullName)}`}
                      />
                      {errors.fullName && <span className="va-app-error">{errors.fullName}</span>}
                    </div>

                    <div className="va-app-field">
                      <label className="va-app-label">Email Address <span className="va-app-required">*</span></label>
                      <div className="va-app-input-wrap">
                        <Mail size={18} className="va-app-input-wrap__icon" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your.email@example.com"
                          className={`va-app-input va-app-input--with-icon${inputErrorClass(errors.email)}`}
                        />
                      </div>
                      {errors.email && <span className="va-app-error">{errors.email}</span>}
                    </div>

                    <div className="va-app-field">
                      <label className="va-app-label">Phone Number <span className="va-app-required">*</span></label>
                      <div className="va-app-phone-row">
                        <span className="va-app-phone-prefix">+91</span>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          placeholder="10-digit mobile number"
                          className={`va-app-input${inputErrorClass(errors.phoneNumber)}`}
                        />
                      </div>
                      {errors.phoneNumber && <span className="va-app-error">{errors.phoneNumber}</span>}
                    </div>

                    <div className="va-app-field">
                      <label className="va-app-label">Location <span className="va-app-required">*</span></label>
                      <div className="va-app-input-wrap">
                        <MapPin size={18} className="va-app-input-wrap__icon" />
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="City, State"
                          className={`va-app-input va-app-input--with-icon${inputErrorClass(errors.location)}`}
                        />
                      </div>
                      {errors.location && <span className="va-app-error">{errors.location}</span>}
                    </div>

                    <div className="va-app-field">
                      <label className="va-app-label">Profile Photo <span className="va-app-required">*</span></label>
                      <input
                        type="file"
                        name="profilePhoto"
                        ref={profilePhotoRef}
                        onChange={handleChange}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        id="profilePhotoInput"
                      />
                      <label
                        htmlFor="profilePhotoInput"
                        className={`va-app-upload${errors.profilePhoto ? ' va-app-upload--error' : ''}`}
                      >
                        {profilePhotoPreview ? (
                          <img src={profilePhotoPreview} alt="Profile preview" className="va-app-upload__preview" />
                        ) : (
                          <>
                            <Camera size={28} className="va-app-upload__icon" />
                            <span className="va-app-upload__title">Click to upload profile photo</span>
                            <span className="va-app-upload__meta">JPG, PNG, WEBP — max 5MB</span>
                          </>
                        )}
                      </label>
                      {errors.profilePhoto && <span className="va-app-error">{errors.profilePhoto}</span>}
                    </div>

                    <div className="va-app-field">
                      <label className={`va-app-checkbox-card${errors.isAdult ? ' va-app-checkbox-card--error' : ''}`}>
                        <input
                          id="isAdult"
                          name="isAdult"
                          type="checkbox"
                          checked={formData.isAdult}
                          onChange={handleChange}
                        />
                        <span className="va-app-checkbox-card__text">
                          <strong>I confirm that I am 18 years of age or older</strong> <span className="va-app-required">*</span>
                        </span>
                      </label>
                      {errors.isAdult && <span className="va-app-error">{errors.isAdult}</span>}
                    </div>
                  </div>
                </div>

                {/* Section 2 - Professional Information */}
                <div className="va-app-section">
                  <div className="va-app-section-header">
                    <span className="va-app-section-icon">
                      <Briefcase size={20} />
                    </span>
                    <h3 className="va-app-section-title">Professional Information</h3>
                  </div>
                  <div className="va-app-section-body">
                    <div className="va-app-field">
                      <div className="va-app-label-row">
                        <label className="va-app-label">Short Bio <span className="va-app-required">*</span></label>
                        <span className={`va-app-char-count${bioCharCount >= 100 ? ' va-app-char-count--valid' : ''}`}>
                          {bioCharCount} / 100 characters
                        </span>
                      </div>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Tell us about yourself, your background, and what makes you a great DeltaOperator..."
                        className={`va-app-textarea${textareaErrorClass(errors.bio)}`}
                      />
                      {errors.bio && <span className="va-app-error">{errors.bio}</span>}
                    </div>

                    <VaRolePicker
                      selectedRole={formData.roles[0] || ''}
                      customRole={formData.customRole}
                      error={errors.roles}
                      customError={errors.customRole}
                      onSelectRole={(role) => {
                        setFormData((prev) => ({
                          ...prev,
                          roles: role ? [role] : [],
                          customRole: role === VA_ROLE_OTHER ? prev.customRole : '',
                        }));
                        setErrors((prev) => ({ ...prev, roles: null, customRole: null }));
                      }}
                      onCustomRoleChange={(value) => {
                        setFormData((prev) => ({ ...prev, customRole: value }));
                        if (errors.customRole) {
                          setErrors((prev) => ({ ...prev, customRole: null }));
                        }
                      }}
                    />

                    <div className="va-app-field-grid">
                      <div className="va-app-field">
                        <label className="va-app-label">Skills <span className="va-app-required">*</span></label>
                        <input
                          type="text"
                          name="skills"
                          value={formData.skills}
                          onChange={handleChange}
                          placeholder="e.g. Excel, Communication, CRM"
                          className={`va-app-input${inputErrorClass(errors.skills)}`}
                        />
                        {errors.skills && <span className="va-app-error">{errors.skills}</span>}
                      </div>

                      <div className="va-app-field">
                        <label className="va-app-label">Years of Experience <span className="va-app-required">*</span></label>
                        <select
                          name="yearsOfExperience"
                          value={formData.yearsOfExperience}
                          onChange={handleChange}
                          className={`va-app-select${selectErrorClass(errors.yearsOfExperience)}`}
                        >
                          <option value="">Select experience</option>
                          <option value="0-1">Less than 1 year</option>
                          <option value="1-2">1-2 years</option>
                          <option value="2-5">2-5 years</option>
                          <option value="5-10">5-10 years</option>
                          <option value="10+">10+ years</option>
                        </select>
                        {errors.yearsOfExperience && <span className="va-app-error">{errors.yearsOfExperience}</span>}
                      </div>

                      <div className="va-app-field">
                        <label className="va-app-label">Languages Known <span className="va-app-required">*</span></label>
                        <input
                          type="text"
                          name="languages"
                          value={formData.languages}
                          onChange={handleChange}
                          placeholder="e.g. English, Hindi, Spanish"
                          className={`va-app-input${inputErrorClass(errors.languages)}`}
                        />
                        {errors.languages && <span className="va-app-error">{errors.languages}</span>}
                      </div>

                      <div className="va-app-field">
                        <label className="va-app-label">LinkedIn Profile URL <span className="va-app-required">*</span></label>
                        <div className="va-app-input-wrap">
                          <Globe size={18} className="va-app-input-wrap__icon" />
                          <input
                            type="url"
                            name="linkedinUrl"
                            value={formData.linkedinUrl}
                            onChange={handleChange}
                            placeholder="https://linkedin.com/in/yourprofile"
                            className={`va-app-input va-app-input--with-icon${inputErrorClass(errors.linkedinUrl)}`}
                          />
                        </div>
                        {errors.linkedinUrl && <span className="va-app-error">{errors.linkedinUrl}</span>}
                      </div>
                    </div>

                    <div className="va-app-field">
                      <label className="va-app-label">Portfolio Website</label>
                      <input
                        type="url"
                        name="portfolioUrl"
                        value={formData.portfolioUrl}
                        onChange={handleChange}
                        placeholder="https://yourportfolio.com"
                        className={`va-app-input${inputErrorClass(errors.portfolioUrl)}`}
                      />
                    </div>

                    <div className="va-app-field">
                      <label className="va-app-label">Resume Link <span className="va-app-required">*</span></label>
                      <input
                        type="url"
                        name="resumeUrl"
                        value={formData.resumeUrl}
                        onChange={handleChange}
                        placeholder="https://drive.google.com/file/d/..."
                        className={`va-app-input${inputErrorClass(errors.resumeUrl)}`}
                      />
                      <p className="va-app-upload__meta" style={{ marginTop: '0.35rem' }}>
                        Please ensure anyone with the link can view your resume.
                      </p>
                      {errors.resumeUrl && <span className="va-app-error">{errors.resumeUrl}</span>}
                    </div>
                  </div>
                </div>

                {/* Section 3 - Work Information */}
                <div className="va-app-section">
                  <div className="va-app-section-header">
                    <span className="va-app-section-icon">
                      <Clock size={20} />
                    </span>
                    <h3 className="va-app-section-title">Work Information</h3>
                  </div>
                  <div className="va-app-section-body">
                    <div className="va-app-field">
                      <label className="va-app-label">Availability <span className="va-app-required">*</span></label>
                      <div className="va-app-availability">
                        {['Full-time', 'Part-time', 'Flexible'].map(option => {
                          const optionVal = option.toLowerCase();
                          const isSelected = formData.availability === optionVal;
                          return (
                            <label
                              key={option}
                              className={`va-app-availability__option${isSelected ? ' va-app-availability__option--selected' : ''}`}
                            >
                              <span className="va-app-availability__radio">
                                <span className="va-app-availability__radio-ring" />
                                {isSelected && (
                                  <span className="va-app-availability__radio-dot" />
                                )}
                              </span>
                              <span className="va-app-availability__label">{option}</span>
                              <input
                                type="radio"
                                name="availability"
                                value={optionVal}
                                checked={isSelected}
                                onChange={handleChange}
                                className="sr-only"
                              />
                            </label>
                          );
                        })}
                      </div>
                      {errors.availability && <span className="va-app-error">{errors.availability}</span>}
                    </div>

                    <div className="va-app-field-grid">
                      <div className="va-app-field">
                        <label className="va-app-label">Hours Available Per Week <span className="va-app-required">*</span></label>
                        <select
                          name="hoursPerWeek"
                          value={formData.hoursPerWeek}
                          onChange={handleChange}
                          className={`va-app-select${selectErrorClass(errors.hoursPerWeek)}`}
                        >
                          <option value="">Select hours per week</option>
                          <option value="<10">Less than 10 hours</option>
                          <option value="10-20">10-20 hours</option>
                          <option value="20-30">20-30 hours</option>
                          <option value="30-40">30-40 hours</option>
                          <option value="40+">40+ hours</option>
                        </select>
                        {errors.hoursPerWeek && <span className="va-app-error">{errors.hoursPerWeek}</span>}
                      </div>

                      <div className="va-app-field">
                        <label className="va-app-label">Expected Compensation <span className="va-app-required">*</span></label>
                        <CurrencyPriceInput
                          id="expected-compensation"
                          label=""
                          value={formData.expectedCompensationAmount}
                          onChange={(v) => setFormData((prev) => ({ ...prev, expectedCompensationAmount: v }))}
                          currency={formData.expectedCompensationCurrency}
                          onCurrencyChange={handleCompensationCurrencyChange}
                          required
                          placeholder="e.g. 50000"
                          inputClassName={`va-app-input${inputErrorClass(errors.expectedCompensation)}`}
                          labelClassName="sr-only"
                        />
                        <p className="va-app-hint">Visible only to administrators for internal pricing.</p>
                        {errors.expectedCompensation && <span className="va-app-error">{errors.expectedCompensation}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4 - Consent */}
                <div className="va-app-section">
                  <div className="va-app-section-header">
                    <span className="va-app-section-icon">
                      <ShieldCheck size={20} />
                    </span>
                    <h3 className="va-app-section-title">Consent</h3>
                  </div>
                  <div className="va-app-section-body">
                    <label className="va-app-checkbox-card">
                      <input
                        id="infoAccurate"
                        name="infoAccurate"
                        type="checkbox"
                        checked={formData.infoAccurate}
                        onChange={handleChange}
                      />
                      <span className="va-app-checkbox-card__text">
                        I confirm that all information provided is accurate and complete. <span className="va-app-required">*</span>
                      </span>
                    </label>
                    {errors.infoAccurate && <span className="va-app-error">{errors.infoAccurate}</span>}

                    <label className="va-app-checkbox-card">
                      <input
                        id="agreeTerms"
                        name="agreeTerms"
                        type="checkbox"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                      />
                      <span className="va-app-checkbox-card__text">
                        I agree to the <a href="/privacy-policy">Privacy Policy</a> and <a href="/terms-and-conditions">Terms of Service</a>. <span className="va-app-required">*</span>
                      </span>
                    </label>
                    {errors.agreeTerms && <span className="va-app-error">{errors.agreeTerms}</span>}
                  </div>
                </div>

                <BotProtectionFields {...botProtectionProps} />

                {/* Submit */}
                <div className="va-app-submit-wrap">
                  <button
                    type="submit"
                    className="btn-glow btn-glow-lg w-full"
                    disabled={submitState.status === 'loading' || requiresTurnstile}
                  >
                    {submitState.status === 'loading' ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                </div>

                {submitState.status === 'success' && (
                  <div className="va-app-alert va-app-alert--success">
                    <Check size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="va-app-alert__title">Application Submitted!</p>
                      <p className="va-app-alert__message">{submitState.message}</p>
                    </div>
                  </div>
                )}

                {submitState.status === 'error' && (
                  <div className="va-app-alert va-app-alert--error">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="va-app-alert__title">Submission Failed</p>
                      <p className="va-app-alert__message">{submitState.message}</p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </PageReveal>
        </div>
      </section>
      <HomeFooter />
    </div>
  );
};

export default VirtualAssistantPage;
