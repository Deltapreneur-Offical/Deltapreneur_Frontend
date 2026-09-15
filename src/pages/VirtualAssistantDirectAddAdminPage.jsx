import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Mail, Phone, MapPin, Camera, Briefcase, FileText,
  Globe, Clock, IndianRupee, Users, Upload, Check, AlertCircle, Loader2
} from 'lucide-react';
import { adminAPI } from '../api/services';
import { readApiError } from '../utils/apiError';
import { vaAdminModulePath } from '../utils/virtualAssistantAdminNav';
import { validateLinkedInProfileUrl } from '../utils/linkedInProfileUrl';
import VaRolePicker from '../components/virtual-assistant/VaRolePicker';
import { resolveVaApplicationRole, VA_ROLE_OTHER } from '../constants/virtualAssistantRoles';

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'temporarily_unavailable', label: 'Temporarily Unavailable' },
];

const VirtualAssistantDirectAddAdminPage = ({ embedded = false, onCancel, onSuccess }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '', email: '', phoneNumber: '', location: '', bio: '',
    roles: [], customRole: '', skills: '', yearsOfExperience: '', languages: '',
    linkedinUrl: '', portfolioUrl: '', resumeUrl: '', availability: 'available',
    hoursPerWeek: '', expectedCompensation: '',
    maxClientCapacity: '', currentAssignedClients: '0',
    publicMonthlyPrice: '', pricingCurrency: 'INR',
    publishImmediately: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const profilePhotoRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      if (name === 'profilePhoto') {
        const file = files[0];
        if (file) {
          const allowed = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowed.includes(file.type)) {
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
    if (name === 'linkedinUrl' && errors.linkedinUrl) {
      setErrors(prev => ({ ...prev, linkedinUrl: validateLinkedInProfileUrl(value) }));
    }
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName || formData.fullName.trim().length < 2) newErrors.fullName = 'Full name is required';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter a valid email address';
    if (!formData.phoneNumber || !/^\d{10,15}$/.test(formData.phoneNumber.replace(/[\s\-]/g, ''))) newErrors.phoneNumber = 'Enter a valid phone number';
    if (!formData.location || formData.location.trim().length < 2) newErrors.location = 'Location is required';
    if (!formData.bio || formData.bio.trim().length < 100) newErrors.bio = 'Please provide a short bio (at least 100 characters)';
    const roleResult = resolveVaApplicationRole(formData.roles[0], formData.customRole);
    if (roleResult.error) {
      if (formData.roles[0] === VA_ROLE_OTHER) newErrors.customRole = roleResult.error;
      else newErrors.roles = roleResult.error;
    }
    if (!formData.skills || formData.skills.trim().length < 2) newErrors.skills = 'Please list your skills';
    if (!formData.yearsOfExperience) newErrors.yearsOfExperience = 'Please select years of experience';
    if (!formData.languages || formData.languages.trim().length < 2) newErrors.languages = 'Please enter languages known';
    const linkedinError = validateLinkedInProfileUrl(formData.linkedinUrl);
    if (linkedinError) newErrors.linkedinUrl = linkedinError;
    if (!formData.expectedCompensation || formData.expectedCompensation.trim().length < 1) newErrors.expectedCompensation = 'Please enter expected compensation';
    if (!formData.publicMonthlyPrice || Number(formData.publicMonthlyPrice) < 0) newErrors.publicMonthlyPrice = 'Please enter a valid public monthly price';
    if (!formData.maxClientCapacity || Number(formData.maxClientCapacity) < 1) newErrors.maxClientCapacity = 'Please enter a valid capacity';
    const profilePhotoFile = profilePhotoRef.current?.files?.[0];
    if (!profilePhotoFile) newErrors.profilePhoto = 'Profile photo is required';
    const resumeLink = (formData.resumeUrl || '').trim();
    if (!resumeLink) newErrors.resumeUrl = 'Resume link is required';
    else if (!/^https?:\/\//i.test(resumeLink)) newErrors.resumeUrl = 'Enter a valid URL starting with http:// or https://';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setLoading(true);
    setSuccess(null);
    try {
      const submitData = new FormData();
      submitData.append('full_name', formData.fullName.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('phone_number', formData.phoneNumber.trim());
      submitData.append('location', formData.location.trim());
      submitData.append('bio', formData.bio.trim());
      const roleResult = resolveVaApplicationRole(formData.roles[0], formData.customRole);
      if (roleResult.error || !roleResult.role) {
        setErrors((prev) => ({
          ...prev,
          ...(formData.roles[0] === VA_ROLE_OTHER
            ? { customRole: roleResult.error }
            : { roles: roleResult.error }),
        }));
        setLoading(false);
        return;
      }
      submitData.append('roles', roleResult.role);
      submitData.append('skills', formData.skills.trim());
      submitData.append('years_of_experience', formData.yearsOfExperience);
      submitData.append('languages', formData.languages.trim());
      submitData.append('linkedin_url', formData.linkedinUrl.trim());
      submitData.append('portfolio_url', formData.portfolioUrl.trim());
      submitData.append('availability', formData.availability);
      submitData.append('hours_per_week', formData.hoursPerWeek.trim());
      submitData.append('expected_compensation', formData.expectedCompensation.trim());
      submitData.append('max_client_capacity', String(formData.maxClientCapacity));
      submitData.append('current_assigned_clients', String(formData.currentAssignedClients || 0));
      submitData.append('public_monthly_price_inr', String(formData.publicMonthlyPrice || 0));
      submitData.append('pricing_currency', formData.pricingCurrency || 'INR');
      submitData.append('publish_immediately', String(formData.publishImmediately));

      const profilePhotoFile = profilePhotoRef.current?.files?.[0];
      if (profilePhotoFile) submitData.append('profile_photo', profilePhotoFile);
      submitData.append('resume_url', formData.resumeUrl.trim());

      const response = await adminAPI.directAddVirtualAssistant(submitData);
      setSuccess('DeltaOperator profile created successfully.');
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => navigate(vaAdminModulePath('applications')), 1200);
      }
    } catch (error) {
      console.error('Direct Add DeltaOperator error:', error);
      const detail = readApiError(error, 'Failed to create DeltaOperator profile.');
      setErrors({ submit: detail });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate(vaAdminModulePath('applications'));
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 border rounded-lg focus:outline-none focus:ring-2 transition-all ${errors[field] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`;

  return (
    <div className={embedded ? 'w-full' : 'min-h-screen bg-gray-50'}>
      <div className={embedded ? 'w-full' : 'max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8'}>
        {!embedded && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Direct Add DeltaOperator</h1>
          <p className="mt-2 text-gray-600">Create a DeltaOperator profile manually without a public application.</p>
        </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <Check size={16} /> {success}
          </div>
        )}

        {errors.submit && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} /> {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={18} className="text-purple-600" /> Personal Details
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter full name" className={inputClass('fullName')} />
                {errors.fullName && <span className="text-xs text-red-500 mt-1 block">{errors.fullName}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                <div className="relative"><Mail size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="admin@example.com" className={`${inputClass('email')} pl-10`} /></div>
                {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative"><Phone size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="+91 98765 43210" className={`${inputClass('phoneNumber')} pl-10`} /></div>
                {errors.phoneNumber && <span className="text-xs text-red-500 mt-1 block">{errors.phoneNumber}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location <span className="text-red-500">*</span></label>
                <div className="relative"><MapPin size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="City, Country" className={`${inputClass('location')} pl-10`} /></div>
                {errors.location && <span className="text-xs text-red-500 mt-1 block">{errors.location}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Short Bio <span className="text-red-500">*</span></label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} placeholder="Brief professional summary" className={inputClass('bio')} />
                {errors.bio && <span className="text-xs text-red-500 mt-1 block">{errors.bio}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo <span className="text-red-500">*</span></label>
                <input type="file" name="profilePhoto" ref={profilePhotoRef} onChange={handleChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
                <button type="button" onClick={() => profilePhotoRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Upload size={16} /> {profilePhotoPreview ? 'Change Photo' : 'Upload Photo'}
                </button>
                {profilePhotoPreview && <img src={profilePhotoPreview} alt="Preview" className="mt-3 h-20 w-20 rounded-lg object-cover border border-gray-200" />}
                {errors.profilePhoto && <span className="text-xs text-red-500 mt-1 block">{errors.profilePhoto}</span>}
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase size={18} className="text-purple-600" /> Professional Details
            </h2>
            <div className="space-y-5">
              <VaRolePicker
                selectedRole={formData.roles[0] || ''}
                customRole={formData.customRole}
                error={errors.roles}
                customError={errors.customRole}
                label="DeltaOperator Role"
                labelClassName="block text-sm font-semibold text-gray-700 mb-2"
                errorClassName="text-xs text-red-500 mt-1 block"
                inputClassName={inputClass('roles')}
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Skills <span className="text-red-500">*</span></label>
                <input type="text" name="skills" value={formData.skills} onChange={handleChange} placeholder="e.g. Data entry, Excel, Communication" className={inputClass('skills')} />
                {errors.skills && <span className="text-xs text-red-500 mt-1 block">{errors.skills}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Years of Experience <span className="text-red-500">*</span></label>
                <select name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} className={inputClass('yearsOfExperience')}>
                  <option value="">Select experience</option>
                  {['< 1 year', '1-2 years', '2-3 years', '3-5 years', '5+ years'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {errors.yearsOfExperience && <span className="text-xs text-red-500 mt-1 block">{errors.yearsOfExperience}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Languages <span className="text-red-500">*</span></label>
                <input type="text" name="languages" value={formData.languages} onChange={handleChange} placeholder="e.g. English, Hindi" className={inputClass('languages')} />
                {errors.languages && <span className="text-xs text-red-500 mt-1 block">{errors.languages}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn Profile URL <span className="text-red-500">*</span></label>
                <div className="relative"><Globe size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange} placeholder="https://linkedin.com/in/..." className={`${inputClass('linkedinUrl')} pl-10`} /></div>
                {errors.linkedinUrl && <span className="text-xs text-red-500 mt-1 block">{errors.linkedinUrl}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Portfolio / Website URL</label>
                <div className="relative"><Globe size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="url" name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange} placeholder="https://..." className={`${inputClass('portfolioUrl')} pl-10`} /></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Resume Link <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  name="resumeUrl"
                  value={formData.resumeUrl}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Please ensure anyone with the link can view your resume.</p>
                {errors.resumeUrl && <span className="text-xs text-red-500 mt-1 block">{errors.resumeUrl}</span>}
              </div>
            </div>
          </div>

          {/* Pricing & Capacity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <IndianRupee size={18} className="text-purple-600" /> Pricing & Capacity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Compensation (Private) <span className="text-red-500">*</span></label>
                <div className="relative"><IndianRupee size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="text" name="expectedCompensation" value={formData.expectedCompensation} onChange={handleChange} placeholder="e.g. ₹15,000/month or ₹500/hour" className={`${inputClass('expectedCompensation')} pl-10`} /></div>
                {errors.expectedCompensation && <span className="text-xs text-red-500 mt-1 block">{errors.expectedCompensation}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Monthly Price (Public) <span className="text-red-500">*</span></label>
                <div className="relative"><IndianRupee size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="number" name="publicMonthlyPrice" value={formData.publicMonthlyPrice} onChange={handleChange} placeholder="e.g. 20000" min="0" step="1" className={`${inputClass('publicMonthlyPrice')} pl-10`} /></div>
                {errors.publicMonthlyPrice && <span className="text-xs text-red-500 mt-1 block">{errors.publicMonthlyPrice}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                <select name="pricingCurrency" value={formData.pricingCurrency} onChange={handleChange} className={inputClass('pricingCurrency')}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Maximum Client Capacity <span className="text-red-500">*</span></label>
                <div className="relative"><Users size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="number" name="maxClientCapacity" value={formData.maxClientCapacity} onChange={handleChange} placeholder="e.g. 5" min="1" className={`${inputClass('maxClientCapacity')} pl-10`} /></div>
                {errors.maxClientCapacity && <span className="text-xs text-red-500 mt-1 block">{errors.maxClientCapacity}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Assigned Clients</label>
                <div className="relative"><Users size={18} className="absolute left-3 top-3.5 text-gray-400" /><input type="number" name="currentAssignedClients" value={formData.currentAssignedClients} onChange={handleChange} placeholder="0" min="0" className={`${inputClass('currentAssignedClients')} pl-10`} /></div>
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-purple-600" /> Availability
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {AVAILABILITY_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${formData.availability === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="availability" value={opt.value} checked={formData.availability === opt.value} onChange={handleChange} className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Publish Options */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Publish Options</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer flex-1">
                <input type="radio" name="publishOption" checked={formData.publishImmediately} onChange={() => setFormData(prev => ({ ...prev, publishImmediately: true }))} className="h-4 w-4 text-purple-600" />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Publish Immediately</span>
                  <p className="text-xs text-gray-500">Make this profile publicly visible in the DeltaOperator Marketplace.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer flex-1">
                <input type="radio" name="publishOption" checked={!formData.publishImmediately} onChange={() => setFormData(prev => ({ ...prev, publishImmediately: false }))} className="h-4 w-4 text-purple-600" />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Save as Draft</span>
                  <p className="text-xs text-gray-500">Keep the profile hidden until published by an admin.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={handleCancel} className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {formData.publishImmediately ? 'Publish Profile' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VirtualAssistantDirectAddAdminPage;
