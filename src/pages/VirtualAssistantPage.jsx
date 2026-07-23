import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { virtualAssistantAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import TopNavbar from '../components/common/TopNavbar';
import HomeNavbar from '../components/common/HomeNavbar';
import HomeFooter from '../components/common/HomeFooter';
import BackToHomeButton from '../components/common/BackToHomeButton';
import Confetti from '../components/common/Confetti';
import BotProtectionFields from '../components/common/BotProtectionFields';
import { useBotProtection } from '../hooks/useBotProtection';
import {
  PageHero,
  PageHeroItem,
  PageReveal,
  PageStagger,
  PageStaggerItem,
} from '../components/motion/PageMotion';
import { HOME_EASE, pageCardHover } from '../components/motion/motionPresets';
import {
  User, Mail, Phone, MapPin, Camera, ShieldCheck,
  Briefcase, FileText, Globe, Clock, IndianRupee,
  ChevronDown, Check, AlertCircle, Loader2, Upload
} from 'lucide-react';

const VIRTUAL_ASSISTANT_ROLES = [
  { value: 'Administrative Support', label: 'Administrative Support' },
  { value: 'Customer Support', label: 'Customer Support' },
  { value: 'Data Entry', label: 'Data Entry' },
  { value: 'Social Media Management', label: 'Social Media Management' },
  { value: 'Content Writing', label: 'Content Writing' },
  { value: 'Email Management', label: 'Email Management' },
  { value: 'Research', label: 'Research' },
  { value: 'Technical Support', label: 'Technical Support' },
  { value: 'Sales Support', label: 'Sales Support' },
  { value: 'Personal Assistance', label: 'Personal Assistance' },
  { value: 'Project Coordination', label: 'Project Coordination' },
  { value: 'Calendar Management', label: 'Calendar Management' },
];

const VirtualAssistantPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  } = useBotProtection({ active: true });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    location: '',
    isAdult: false,
    bio: '',
    roles: [],
    skills: '',
    yearsOfExperience: '',
    languages: '',
    linkedinUrl: '',
    portfolioUrl: '',
    availability: '',
    hoursPerWeek: '',
    expectedCompensation: '',
    infoAccurate: false,
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '', data: null });
  const [showConfetti, setShowConfetti] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [resumePreview, setResumePreview] = useState(null);
  const profilePhotoRef = useRef(null);
  const resumeRef = useRef(null);
  const { user, hasAccessToken } = useAuth();

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
      } else if (name === 'resume') {
        const file = files[0];
        if (file) {
          const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          const allowedExts = ['.pdf', '.doc', '.docx'];
          const ext = '.' + file.name.split('.').pop().toLowerCase();
          if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
            setErrors(prev => ({ ...prev, resume: 'Only PDF, DOC, or DOCX files are allowed' }));
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, resume: 'Resume must be under 10MB' }));
            return;
          }
          setErrors(prev => ({ ...prev, resume: null }));
          setResumePreview(file.name);
        }
      }
      return;
    }
    if (name === 'roles') {
      const selected = Array.from(e.target.selectedOptions, option => option.value);
      setFormData(prev => ({ ...prev, roles: selected }));
      if (selected.length === 0) {
        setErrors(prev => ({ ...prev, roles: 'Please select at least one role' }));
      } else {
        setErrors(prev => ({ ...prev, roles: null }));
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
    if (!formData.roles || formData.roles.length === 0) {
      newErrors.roles = 'Please select at least one Virtual Assistant role';
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
    if (!formData.hoursPerWeek) {
      newErrors.hoursPerWeek = 'Please specify hours available per week';
    }
    if (!formData.expectedCompensation || formData.expectedCompensation.trim().length < 1) {
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
    // Check required file uploads
    const profilePhotoFile = profilePhotoRef.current?.files?.[0];
    const resumeFile = resumeRef.current?.files?.[0];
    if (!profilePhotoFile) {
      newErrors.profilePhoto = 'Profile photo is required';
    }
    if (!resumeFile) {
      newErrors.resume = 'Resume/CV is required';
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
      setSubmitState({ status: 'loading', message: '', data: null });

      const submitData = new FormData();
      submitData.append('full_name', formData.fullName.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('phone_number', formData.phoneNumber.trim());
      submitData.append('location', formData.location.trim());
      submitData.append('is_adult', String(formData.isAdult));
      submitData.append('bio', formData.bio.trim());
      submitData.append('roles', formData.roles.join(','));
      submitData.append('skills', formData.skills.trim());
      submitData.append('years_of_experience', formData.yearsOfExperience.trim());
      submitData.append('languages', formData.languages.trim());
      submitData.append('linkedin_url', formData.linkedinUrl.trim());
      submitData.append('portfolio_url', formData.portfolioUrl.trim());
      submitData.append('availability', formData.availability);
      submitData.append('hours_per_week', formData.hoursPerWeek);
      submitData.append('expected_compensation', formData.expectedCompensation.trim());
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
      const resumeFile = resumeRef.current?.files?.[0];
      if (profilePhotoFile) submitData.append('profile_photo', profilePhotoFile);
      if (resumeFile) submitData.append('resume', resumeFile);

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
      console.error('Response data:', error?.response?.data);
      console.error('Response status:', error?.response?.status);
      const responseData = error?.response?.data;
      let detail = responseData?.detail || responseData?.message || error?.message || 'Something went wrong. Please try again later.';
      if (detail && typeof detail === 'object') {
        detail = JSON.stringify(detail);
      }
      setSubmitState({
        status: 'error',
        message: detail,
        data: null,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <TopNavbar homeMobileMenu />
      <HomeNavbar
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        navigate={navigate}
      />
      <Confetti show={showConfetti} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <BackToHomeButton />
      </div>

      <PageHero className="max-w-4xl mx-auto text-center pt-4 sm:pt-6 pb-4 px-4">
        <PageHeroItem>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-green-100 border border-green-300 rounded-full text-xs sm:text-sm font-semibold text-green-700 mb-5 sm:mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            We're hiring Virtual Assistants
          </div>
        </PageHeroItem>
        <PageHeroItem>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            Become a Virtual Assistant
          </h1>
        </PageHeroItem>
        <PageHeroItem>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-10 md:mb-12 max-w-3xl mx-auto leading-relaxed">
            Join CoBrother as a Virtual Assistant and help businesses thrive with your skills. Work flexibly, earn competitively, and grow with us.
          </p>
        </PageHeroItem>
      </PageHero>

      <section className="py-10 sm:py-14 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <PageReveal>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-5 sm:p-7 lg:p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1 - Personal Information */}
                <div>
                  <h3 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
                    <User size={20} className="text-purple-600" />
                    Personal Information
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className={`w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                      />
                      {errors.fullName && <span className="text-xs text-red-500 mt-1 block">{errors.fullName}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your.email@example.com"
                          className={`w-full pl-10 pr-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                        />
                      </div>
                      {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                      <div className="flex items-center gap-2">
                        <span className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">+91</span>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          placeholder="10-digit mobile number"
                          className={`flex-1 px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.phoneNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                        />
                      </div>
                      {errors.phoneNumber && <span className="text-xs text-red-500 mt-1 block">{errors.phoneNumber}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Location <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="City, State"
                          className={`w-full pl-10 pr-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                        />
                      </div>
                      {errors.location && <span className="text-xs text-red-500 mt-1 block">{errors.location}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo <span className="text-red-500">*</span></label>
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
                        className={`flex items-center justify-center gap-3 w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${errors.profilePhoto ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-purple-500 hover:bg-purple-50'}`}
                      >
                        {profilePhotoPreview ? (
                          <img src={profilePhotoPreview} alt="Profile preview" className="w-16 h-16 rounded-full object-cover border-2 border-purple-500" />
                        ) : (
                          <>
                            <Camera size={24} className="text-gray-400" />
                            <span className="text-sm text-gray-600 font-medium">Click to upload profile photo (JPG, PNG, WEBP - max 5MB)</span>
                          </>
                        )}
                      </label>
                      {errors.profilePhoto && <span className="text-xs text-red-500 mt-1 block">{errors.profilePhoto}</span>}
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center h-5">
                        <input
                          id="isAdult"
                          name="isAdult"
                          type="checkbox"
                          checked={formData.isAdult}
                          onChange={handleChange}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="isAdult" className="text-sm font-semibold text-gray-900 cursor-pointer">
                          I confirm that I am 18 years of age or older <span className="text-red-500">*</span>
                        </label>
                        {errors.isAdult && <span className="text-xs text-red-500 mt-1 block">{errors.isAdult}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2 - Professional Information */}
                <div>
                  <h3 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
                    <Briefcase size={20} className="text-purple-600" />
                    Professional Information
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Short Bio <span className="text-red-500">*</span>
                        </label>
                        <span className={`text-xs ${bioCharCount < 100 ? 'text-gray-500 font-medium' : 'text-green-600 font-semibold'}`}>
                          {bioCharCount} / 100 characters
                        </span>
                      </div>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Tell us about yourself, your background, and what makes you a great Virtual Assistant..."
                        className={`w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${errors.bio ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                      />
                      {errors.bio && <span className="text-xs text-red-500 mt-1 block">{errors.bio}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Select Virtual Assistant Roles <span className="text-red-500">*</span></label>
                      <select
                        name="roles"
                        multiple
                        value={formData.roles}
                        onChange={handleChange}
                        size="6"
                        className={`w-full px-4 py-3 bg-white text-gray-900 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.roles ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                      >
                        {VIRTUAL_ASSISTANT_ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple roles</p>
                      {errors.roles && <span className="text-xs text-red-500 mt-1 block">{errors.roles}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Skills <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="e.g. Excel, Communication, CRM, Social Media"
                        className={`w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.skills ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                      />
                      {errors.skills && <span className="text-xs text-red-500 mt-1 block">{errors.skills}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Years of Experience <span className="text-red-500">*</span></label>
                      <select
                        name="yearsOfExperience"
                        value={formData.yearsOfExperience}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 bg-white text-gray-900 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.yearsOfExperience ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                      >
                        <option value="">Select experience</option>
                        <option value="0-1">Less than 1 year</option>
                        <option value="1-2">1-2 years</option>
                        <option value="2-5">2-5 years</option>
                        <option value="5-10">5-10 years</option>
                        <option value="10+">10+ years</option>
                      </select>
                      {errors.yearsOfExperience && <span className="text-xs text-red-500 mt-1 block">{errors.yearsOfExperience}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Languages Known <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="languages"
                        value={formData.languages}
                        onChange={handleChange}
                        placeholder="e.g. English, Hindi, Spanish"
                        className={`w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.languages ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                      />
                      {errors.languages && <span className="text-xs text-red-500 mt-1 block">{errors.languages}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn Profile URL</label>
                      <div className="relative">
                        <Globe size={18} className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                          type="url"
                          name="linkedinUrl"
                          value={formData.linkedinUrl}
                          onChange={handleChange}
                          placeholder="https://linkedin.com/in/yourprofile"
                          className="w-full pl-10 pr-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Portfolio Website</label>
                      <input
                        type="url"
                        name="portfolioUrl"
                        value={formData.portfolioUrl}
                        onChange={handleChange}
                        placeholder="https://yourportfolio.com"
                        className="w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Resume / CV <span className="text-red-500">*</span></label>
                      <input
                        type="file"
                        name="resume"
                        ref={resumeRef}
                        onChange={handleChange}
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        id="resumeInput"
                      />
                      <label
                        htmlFor="resumeInput"
                        className={`flex items-center gap-3 w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${errors.resume ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-purple-500 hover:bg-purple-50'}`}
                      >
                        <Upload size={24} className="text-gray-400" />
                        <span className="text-sm text-gray-600 font-medium">
                          {resumePreview || 'Click to upload Resume / CV (PDF, DOC, DOCX - max 10MB)'}
                        </span>
                      </label>
                      {errors.resume && <span className="text-xs text-red-500 mt-1 block">{errors.resume}</span>}
                    </div>
                  </div>
                </div>

                {/* Section 3 - Work Information */}
                <div>
                  <h3 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
                    <Clock size={20} className="text-purple-600" />
                    Work Information
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Availability <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-3">
                        {['Full-time', 'Part-time', 'Flexible'].map(option => {
                          const optionVal = option.toLowerCase();
                          const isSelected = formData.availability === optionVal;
                          return (
                            <label
                              key={option}
                              className={`flex items-center gap-2.5 px-4 py-3 border rounded-xl cursor-pointer transition-all duration-200 ease-in-out ${
                                isSelected
                                  ? 'bg-white border-purple-600 text-purple-700 font-semibold shadow-xs ring-1 ring-purple-600/30'
                                  : 'bg-white border-gray-300 text-gray-700 font-medium hover:border-purple-300 hover:bg-purple-50/20'
                              }`}
                            >
                              <input
                                type="radio"
                                name="availability"
                                value={optionVal}
                                checked={isSelected}
                                onChange={handleChange}
                                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500 accent-purple-600"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          );
                        })}
                      </div>
                      {errors.availability && <span className="text-xs text-red-500 mt-1 block">{errors.availability}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Hours Available Per Week <span className="text-red-500">*</span></label>
                      <select
                        name="hoursPerWeek"
                        value={formData.hoursPerWeek}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 bg-white text-gray-900 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.hoursPerWeek ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                      >
                        <option value="">Select hours per week</option>
                        <option value="<10">Less than 10 hours</option>
                        <option value="10-20">10-20 hours</option>
                        <option value="20-30">20-30 hours</option>
                        <option value="30-40">30-40 hours</option>
                        <option value="40+">40+ hours</option>
                      </select>
                      {errors.hoursPerWeek && <span className="text-xs text-red-500 mt-1 block">{errors.hoursPerWeek}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Compensation <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <IndianRupee size={18} className="absolute left-3 top-3.5 text-gray-400" />
                        <input
                          type="text"
                          name="expectedCompensation"
                          value={formData.expectedCompensation}
                          onChange={handleChange}
                          placeholder="e.g. 25000/month or 500/hour"
                          className={`w-full pl-10 pr-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors.expectedCompensation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">This information is private and visible only to administrators for internal pricing decisions.</p>
                      {errors.expectedCompensation && <span className="text-xs text-red-500 mt-1 block">{errors.expectedCompensation}</span>}
                    </div>
                  </div>
                </div>

                {/* Section 4 - Consent */}
                <div>
                  <h3 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
                    <ShieldCheck size={20} className="text-purple-600" />
                    Consent
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id="infoAccurate"
                          name="infoAccurate"
                          type="checkbox"
                          checked={formData.infoAccurate}
                          onChange={handleChange}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </div>
                      <label htmlFor="infoAccurate" className="text-sm text-gray-700 cursor-pointer">
                        I confirm that all information provided is accurate and complete. <span className="text-red-500">*</span>
                      </label>
                    </div>
                    {errors.infoAccurate && <span className="text-xs text-red-500 mt-1 block ml-1">{errors.infoAccurate}</span>}

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id="agreeTerms"
                          name="agreeTerms"
                          type="checkbox"
                          checked={formData.agreeTerms}
                          onChange={handleChange}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </div>
                      <label htmlFor="agreeTerms" className="text-sm text-gray-700 cursor-pointer">
                        I agree to the <a href="/privacy-policy" className="text-purple-600 underline">Privacy Policy</a> and <a href="/terms-and-conditions" className="text-purple-600 underline">Terms of Service</a>. <span className="text-red-500">*</span>
                      </label>
                    </div>
                    {errors.agreeTerms && <span className="text-xs text-red-500 mt-1 block ml-1">{errors.agreeTerms}</span>}
                  </div>
                </div>

                <BotProtectionFields {...botProtectionProps} />

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn-glow w-full btn-glow-lg"
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

                {submitState.status === 'success' && (
                  <div className="flex items-start gap-3 p-4 bg-green-100 border border-green-300 rounded-lg">
                    <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-green-900">Application Submitted!</p>
                      <p className="text-xs text-green-700 mt-1">{submitState.message}</p>
                    </div>
                  </div>
                )}

                {submitState.status === 'error' && (
                  <div className="flex items-start gap-3 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-900">Submission Failed</p>
                      <p className="text-xs text-red-700 mt-1">{submitState.message}</p>
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
