import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, X, Check, XCircle, Clock, User, Mail, Phone, MapPin, Briefcase, FileText, Globe, Clock3, IndianRupee, Loader2, Bell } from 'lucide-react';
import { adminAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';

const STATUS_BADGE_CLASSES = {
  pending: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  partially_approved: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const ROLE_STATUS_DOT = {
  pending: '🟡',
  approved: '🟢',
  rejected: '🔴',
};

function formatStatusLabel(status) {
  if (!status) return 'Pending';
  return status.replace('_', ' ').replace('-', ' ');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VirtualAssistantApplicationDetailPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [roleNotes, setRoleNotes] = useState({});
  const [error, setError] = useState('');
  const [roleMessage, setRoleMessage] = useState('');
  const [pricing, setPricing] = useState({ publicMonthlyPriceInr: '', pricingCurrency: 'INR', maxClientCapacity: '' });
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingMessage, setPricingMessage] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [capacityValues, setCapacityValues] = useState({});
  const [savingCapacityId, setSavingCapacityId] = useState(null);
  const [capacityMessage, setCapacityMessage] = useState('');
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingAdminNotes, setSavingAdminNotes] = useState(false);
  const [adminNotesMessage, setAdminNotesMessage] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setRoleMessage('');
    setPricingMessage('');
    setPublishMessage('');
    setCapacityMessage('');
    setAdminNotesMessage('');
    try {
      const [appRes, rolesRes, auditRes, notifRes] = await Promise.all([
        adminAPI.getVirtualAssistant(applicationId),
        adminAPI.getVirtualAssistantRoles(applicationId),
        adminAPI.getVirtualAssistantAuditLogs(applicationId),
        adminAPI.getVirtualAssistantNotifications(applicationId),
      ]);
      const appData = unwrapApiData(appRes);
      const rolesData = unwrapApiData(rolesRes) || [];
      const auditData = unwrapApiData(auditRes) || [];
      const notifData = unwrapApiData(notifRes) || [];
      setApplication(appData);
      setRoles(rolesData);
      setAssignments([]);
      const initialNotes = {};
      rolesData.forEach((r) => {
        if (r.rejectionNote) initialNotes[r.id] = r.rejectionNote;
      });
      setRoleNotes(initialNotes);
      if (appData) {
        setPricing({
          publicMonthlyPriceInr: appData.publicMonthlyPriceInr ?? '',
          pricingCurrency: appData.pricingCurrency || 'INR',
          maxClientCapacity: appData.maxClientCapacity ?? '',
        });
        setAdminNotes(appData.adminNotes || '');
      }
      setAuditLogs(auditData);
      setNotifications(notifData);
    } catch (e) {
      console.error('Failed to load application detail', e);
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.message || 'Failed to load application details. Please try again.';
      setError(status ? `Error ${status}: ${detail}` : detail);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const refreshAll = useCallback(async () => {
    try {
      const [appRes, rolesRes, auditRes, notifRes] = await Promise.all([
        adminAPI.getVirtualAssistant(applicationId),
        adminAPI.getVirtualAssistantRoles(applicationId),
        adminAPI.getVirtualAssistantAuditLogs(applicationId),
        adminAPI.getVirtualAssistantNotifications(applicationId),
      ]);
      const appData = unwrapApiData(appRes);
      const rolesData = unwrapApiData(rolesRes) || [];
      const auditData = unwrapApiData(auditRes) || [];
      const notifData = unwrapApiData(notifRes) || [];
      setApplication(appData);
      setRoles(rolesData);
      setAssignments([]);
      const initialNotes = {};
      rolesData.forEach((r) => {
        if (r.rejectionNote) initialNotes[r.id] = r.rejectionNote;
      });
      setRoleNotes(initialNotes);
      if (appData) {
        setPricing({
          publicMonthlyPriceInr: appData.publicMonthlyPriceInr ?? '',
          pricingCurrency: appData.pricingCurrency || 'INR',
          maxClientCapacity: appData.maxClientCapacity ?? '',
        });
        setAdminNotes(appData.adminNotes || '');
      }
      setAuditLogs(auditData);
      setNotifications(notifData);
    } catch (e) {
      console.error('Failed to refresh data', e);
    }
  }, [applicationId]);

  const fetchAssignments = useCallback(async () => {
    try {
      const appRes = await adminAPI.getVirtualAssistant(applicationId);
      const appData = unwrapApiData(appRes);
      setAssignments(appData?.applicationRoles?.filter((r) => r.status === 'approved') || []);
    } catch (e) {
      console.error('Failed to load assignments', e);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (application) {
      setPricing({
        publicMonthlyPriceInr: application.publicMonthlyPriceInr ?? '',
        pricingCurrency: application.pricingCurrency || 'INR',
        maxClientCapacity: application.maxClientCapacity ?? '',
      });
    }
  }, [application]);

  useEffect(() => {
    if (roles.length > 0) {
      const initial = {};
      roles.forEach((r) => {
        initial[r.id] = { maxClients: r.maxClients ?? '', currentClients: r.currentClients ?? 0, isActive: r.isActive ?? true };
      });
      setCapacityValues(initial);
    }
  }, [roles]);

  const handleRoleUpdate = async (roleId, newStatus) => {
    setSavingRoleId(roleId);
    setRoleMessage('');
    try {
      const rejectionNote = newStatus === 'rejected' ? (roleNotes[roleId] || '') : undefined;
      await adminAPI.updateVirtualAssistantRole(applicationId, roleId, newStatus, rejectionNote);
      setRoleMessage('Role updated successfully.');
      await refreshAll();
    } catch (e) {
      console.error('Failed to update role', e);
      const detail = e?.response?.data?.detail || e?.response?.data?.message || 'Failed to update role status. Please try again.';
      setRoleMessage(detail);
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleDownloadResume = async () => {
    try {
      const response = await adminAPI.downloadVirtualAssistantResume(applicationId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = application?.resumeFilename || `resume-${applicationId}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download resume', e);
      alert('Failed to download resume. Please try again.');
    }
  };

  const handlePricingUpdate = async (e) => {
    e.preventDefault();
    setSavingPricing(true);
    setPricingMessage('');
    try {
      const priceValue = pricing.publicMonthlyPriceInr === '' ? null : Number(pricing.publicMonthlyPriceInr);
      const capacityValue = pricing.maxClientCapacity === '' ? null : Number(pricing.maxClientCapacity);
      if (priceValue !== null && (Number.isNaN(priceValue) || priceValue < 0)) {
        setPricingMessage('Price must be a positive number.');
        setSavingPricing(false);
        return;
      }
      if (capacityValue !== null && (Number.isNaN(capacityValue) || capacityValue < 1)) {
        setPricingMessage('Maximum Client Capacity must be at least 1.');
        setSavingPricing(false);
        return;
      }
      const response = await adminAPI.updateVirtualAssistantPricing(applicationId, {
        publicMonthlyPriceInr: priceValue,
        pricingCurrency: pricing.pricingCurrency,
        maxClientCapacity: capacityValue,
      });
      const updated = unwrapApiData(response);
      setApplication(updated);
      setPricing({
        publicMonthlyPriceInr: updated.publicMonthlyPriceInr ?? '',
        pricingCurrency: updated.pricingCurrency || 'INR',
        maxClientCapacity: updated.maxClientCapacity ?? '',
      });
      setPricingMessage('Pricing updated successfully.');
    } catch (e) {
      console.error('Failed to update pricing', e);
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.response?.data?.error || 'Failed to update pricing. Please try again.';
      setPricingMessage(detail);
    } finally {
      setSavingPricing(false);
    }
  };

  const handlePublishAction = async (action) => {
    setPublishLoading(true);
    setPublishMessage('');
    try {
      const response = await adminAPI.publishVirtualAssistant(applicationId, action);
      const updated = unwrapApiData(response);
      setApplication(updated);
      setPublishMessage(`Profile ${action === 'publish' ? 'published' : action === 'unpublish' ? 'unpublished' : 'saved as draft'} successfully.`);
    } catch (e) {
      console.error('Failed to update publish status', e);
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.response?.data?.error || 'Failed to update publish status. Please try again.';
      setPublishMessage(detail);
    } finally {
      setPublishLoading(false);
    }
  };

  const handleStatusUpdate = async (appId, newStatus) => {
    try {
      await adminAPI.updateVirtualAssistantStatus(appId, newStatus);
      await refreshAll();
    } catch (e) {
      console.error('Failed to update status', e);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleSaveAdminNotes = async () => {
    setSavingAdminNotes(true);
    setAdminNotesMessage('');
    try {
      const response = await adminAPI.updateVirtualAssistantAdminNotes(applicationId, adminNotes);
      const updated = unwrapApiData(response);
      setApplication(updated);
      setAdminNotesMessage('Admin notes saved successfully.');
    } catch (e) {
      console.error('Failed to save admin notes', e);
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.response?.data?.error || 'Failed to save admin notes. Please try again.';
      setAdminNotesMessage(detail);
    } finally {
      setSavingAdminNotes(false);
    }
  };

  const handleCapacityUpdate = async (roleId) => {
    const values = capacityValues[roleId];
    if (!values) return;
    setSavingCapacityId(roleId);
    setCapacityMessage('');
    try {
      const payload = {
        maxClients: values.maxClients === '' ? null : Number(values.maxClients),
        currentClients: values.currentClients === '' ? 0 : Number(values.currentClients),
        isActive: values.isActive,
      };
      if (payload.maxClients !== null && (Number.isNaN(payload.maxClients) || payload.maxClients < 0)) {
        setCapacityMessage('Max clients must be a non-negative number.');
        setSavingCapacityId(null);
        return;
      }
      if (Number.isNaN(payload.currentClients) || payload.currentClients < 0) {
        setCapacityMessage('Current clients must be a non-negative number.');
        setSavingCapacityId(null);
        return;
      }
      if (payload.maxClients !== null && payload.currentClients > payload.maxClients) {
        setCapacityMessage('Current clients cannot exceed max clients.');
        setSavingCapacityId(null);
        return;
      }
      await adminAPI.updateVirtualAssistantRoleCapacity(roleId, payload);
      setCapacityMessage('Capacity updated successfully.');
      await refreshAll();
    } catch (e) {
      console.error('Failed to update capacity', e);
      setCapacityMessage('Failed to update capacity. Please try again.');
    } finally {
      setSavingCapacityId(null);
    }
  };

  const handleCreateAssignment = async () => {
    const company = document.getElementById('assignmentCompany')?.value;
    const role = document.getElementById('assignmentRole')?.value;
    const start = document.getElementById('assignmentStart')?.value;
    const end = document.getElementById('assignmentEnd')?.value;
    if (!company || !role) {
      setCapacityMessage('Company and role are required.');
      return;
    }
    setCapacityMessage('');
    try {
      const res = await adminAPI.createVirtualAssistantAssignment(applicationId, {
        assignedCompany: company,
        assignedRole: role,
        startDate: start || null,
        endDate: end || null,
        notes: null,
      });
      unwrapApiData(res);
      setCapacityMessage('Assignment created successfully.');
      document.getElementById('assignmentCompany').value = '';
      document.getElementById('assignmentRole').value = '';
      document.getElementById('assignmentStart').value = '';
      document.getElementById('assignmentEnd').value = '';
      await refreshAll();
    } catch (e) {
      setCapacityMessage('Failed to create assignment.');
    }
  };

  const overallStatus = application?.overallStatus || application?.status || 'pending';
  const hasApprovedRole = roles.some((r) => r.status === 'approved');
  const canPublish = hasApprovedRole && application?.publicMonthlyPriceInr != null && application?.maxClientCapacity != null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading application details...</span>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error || 'Application not found.'}</p>
        <button
          onClick={() => navigate('/admin/virtual-assistants/applications')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <ArrowLeft size={16} />
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page" data-admin-section="virtual-assistants">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/virtual-assistants/applications')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Applications"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
            <p className="text-sm text-gray-500 mt-1">
              Reference: <span className="font-mono font-semibold text-gray-700">{application.referenceNumber || application.id}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} className="text-purple-600" />
              Applicant Details
            </h2>
            <div className="flex items-start gap-4">
              {application.profilePhotoUrl && !profilePhotoError ? (
                <img
                  src={application.profilePhotoUrl}
                  alt=""
                  className="w-20 h-20 rounded-xl object-cover"
                  onError={() => setProfilePhotoError(true)}
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-purple-100 flex items-center justify-center">
                  <User size={32} className="text-purple-600" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{application.fullName || '—'}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Reference: <span className="font-mono font-semibold text-gray-700">{application.referenceNumber || application.id}</span>
                </p>
                <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[overallStatus] || 'bg-gray-100 text-gray-800'}`}>
                  {formatStatusLabel(overallStatus)}
                </span>
                <p className="text-xs text-gray-500 mt-1">Submitted: {formatDate(application.createdAt)}</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} className="text-purple-600" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm text-gray-900 flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  {application.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone Number</p>
                <p className="text-sm text-gray-900 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  {application.phoneNumber || '—'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Location</p>
                <p className="text-sm text-gray-900 flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  {application.location || '—'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-purple-600" />
              Professional Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Short Bio</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{application.bio || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Skills</p>
                <p className="text-sm text-gray-900">{application.skills || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Years of Experience</p>
                <p className="text-sm text-gray-900">{application.yearsExperience || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Languages</p>
                <p className="text-sm text-gray-900">{application.languagesKnown || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">LinkedIn Profile</p>
                {application.linkedinUrl ? (
                  <a href={application.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                    <Globe size={14} className="text-gray-400" />
                    View LinkedIn
                  </a>
                ) : (
                  <p className="text-sm text-gray-500">—</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Portfolio / Website</p>
                {application.portfolioUrl ? (
                  <a href={application.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                    <Globe size={14} className="text-gray-400" />
                    View Portfolio
                  </a>
                ) : (
                  <p className="text-sm text-gray-500">—</p>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock3 size={20} className="text-purple-600" />
              Work Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Availability</p>
                <p className="text-sm text-gray-900">{application.availability ? application.availability.replace(/_/g, ' ').replace(/-/g, ' ') : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hours Available Per Week</p>
                <p className="text-sm text-gray-900">{application.hoursPerWeek || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Expected Compensation (Admin Only)</p>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <IndianRupee size={14} className="text-gray-400" />
                  {application.expectedCompensation || '—'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Check size={20} className="text-purple-600" />
              Overall Status
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE_CLASSES[overallStatus] || 'bg-gray-100 text-gray-800'}`}>
                  {formatStatusLabel(overallStatus)}
                </span>
                <p className="text-xs text-gray-500 mt-2">
                  Current lifecycle status for this application.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {['pending', 'under_review', 'partially_approved', 'approved', 'rejected'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusUpdate(application.id, s)}
                    disabled={overallStatus === s}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      overallStatus === s
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500 hover:text-purple-600'
                    }`}
                  >
                    {formatStatusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <IndianRupee size={20} className="text-purple-600" />
              Pricing Management
            </h2>
            {pricingMessage && (
              <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${pricingMessage.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {pricingMessage}
              </div>
            )}
            <form onSubmit={handlePricingUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Expected Compensation (Private)</label>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <IndianRupee size={14} className="text-gray-400" />
                  {application.expectedCompensation || '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Visible only to administrators.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer Monthly Price (Public)</label>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pricing.publicMonthlyPriceInr}
                    onChange={(e) => setPricing(prev => ({ ...prev, publicMonthlyPriceInr: e.target.value }))}
                    placeholder="Enter public price in INR"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Currency</label>
                <select
                  value={pricing.pricingCurrency}
                  onChange={(e) => setPricing(prev => ({ ...prev, pricingCurrency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Maximum Client Capacity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricing.maxClientCapacity}
                  onChange={(e) => setPricing(prev => ({ ...prev, maxClientCapacity: e.target.value }))}
                  placeholder="Enter max clients"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="sm:col-span-3 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {application.pricingUpdatedById && (
                    <span>Last updated: {formatDate(application.pricingUpdatedAt)} by Admin</span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={savingPricing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {savingPricing && <Loader2 size={14} className="animate-spin" />}
                  Save Pricing
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={20} className="text-purple-600" />
              Publishing
            </h2>
            {publishMessage && (
              <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${publishMessage.includes('success') || publishMessage.includes('published') || publishMessage.includes('unpublished') || publishMessage.includes('draft') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {publishMessage}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  application.publishStatus === 'published' ? 'bg-green-100 text-green-800' :
                  application.publishStatus === 'unpublished' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {application.publishStatus === 'published' ? '🟢 Published' : application.publishStatus === 'unpublished' ? '🔴 Unpublished' : '🟡 Draft'}
                </span>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  {application.publishedAt && (
                    <p>Published: {formatDate(application.publishedAt)}</p>
                  )}
                  {application.publishedByName && (
                    <p>By: {application.publishedByName}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePublishAction('publish')}
                  disabled={publishLoading || application.publishStatus === 'published' || !canPublish}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canPublish ? 'At least one approved role, pricing, and capacity are required to publish.' : ''}
                >
                  {publishLoading && <Loader2 size={14} className="animate-spin" />}
                  Publish Profile
                </button>
                <button
                  type="button"
                  onClick={() => handlePublishAction('unpublish')}
                  disabled={publishLoading || application.publishStatus === 'unpublished'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishLoading && <Loader2 size={14} className="animate-spin" />}
                  Unpublish Profile
                </button>
                <button
                  type="button"
                  onClick={() => handlePublishAction('draft')}
                  disabled={publishLoading || application.publishStatus === 'draft'}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save as Draft
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-purple-600" />
              Applied Roles
            </h2>
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles specified.</p>
            ) : (
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base leading-none">{ROLE_STATUS_DOT[role.status] || '🟡'}</span>
                        <p className="text-sm font-semibold text-gray-900">{role.roleName}</p>
                      </div>
                      <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[role.status] || 'bg-gray-100 text-gray-800'}`}>
                        {formatStatusLabel(role.status)}
                      </span>
                      {(role.reviewedBy || role.reviewedAt) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {role.reviewedBy ? `Reviewed by ${role.reviewedBy}` : 'Reviewed'}
                          {role.reviewedAt ? ` · ${formatDate(role.reviewedAt)}` : ''}
                        </p>
                      )}
                      {role.rejectionNote && (
                        <p className="text-xs text-red-600 mt-1">Note: {role.rejectionNote}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span>Max Clients: {role.maxClients ?? '—'}</span>
                        <span>Current Clients: {role.currentClients ?? 0}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                          role.availabilityStatus === 'available' ? 'bg-green-50 text-green-700' :
                          role.availabilityStatus === 'limited' ? 'bg-yellow-50 text-yellow-700' :
                          role.availabilityStatus === 'not_available' ? 'bg-red-50 text-red-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {formatStatusLabel(role.availabilityStatus)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Max Clients</label>
                          <input
                            type="number"
                            min="0"
                            value={capacityValues[role.id]?.maxClients ?? ''}
                            onChange={(e) => setCapacityValues((prev) => ({ ...prev, [role.id]: { ...prev[role.id], maxClients: e.target.value } }))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Current Clients</label>
                          <input
                            type="number"
                            min="0"
                            value={capacityValues[role.id]?.currentClients ?? 0}
                            onChange={(e) => setCapacityValues((prev) => ({ ...prev, [role.id]: { ...prev[role.id], currentClients: e.target.value } }))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Active</label>
                          <select
                            value={capacityValues[role.id]?.isActive ? 'true' : 'false'}
                            onChange={(e) => setCapacityValues((prev) => ({ ...prev, [role.id]: { ...prev[role.id], isActive: e.target.value === 'true' } }))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCapacityUpdate(role.id)}
                          disabled={savingCapacityId === role.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {savingCapacityId === role.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Save Capacity
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleRoleUpdate(role.id, 'approved')}
                        disabled={savingRoleId === role.id || role.status === 'approved'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-default"
                        title="Approve this role"
                      >
                        {savingRoleId === role.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleRoleUpdate(role.id, 'rejected')}
                        disabled={savingRoleId === role.id || role.status === 'rejected'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-default"
                        title="Reject this role"
                      >
                        {savingRoleId === role.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <XCircle size={12} />
                        )}
                        Reject
                      </button>
                      <button
                        onClick={() => handleRoleUpdate(role.id, 'pending')}
                        disabled={savingRoleId === role.id || role.status === 'pending'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
                        title="Set as pending"
                      >
                        {savingRoleId === role.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Clock size={12} />
                        )}
                        Pending
                      </button>
                      {role.status === 'rejected' && (
                        <div className="w-full sm:w-auto">
                          <textarea
                            value={roleNotes[role.id] || ''}
                            onChange={(e) => setRoleNotes((prev) => ({ ...prev, [role.id]: e.target.value }))}
                            placeholder="Rejection note (optional)"
                            rows={2}
                            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-purple-600" />
              Assignments
            </h2>
            {capacityMessage && (
              <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${capacityMessage.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {capacityMessage}
              </div>
            )}
            <div className="space-y-3">
              {!hasApprovedRole ? (
                <p className="text-sm text-gray-500">No approved roles yet. Approve a role to create assignments.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Company</label>
                    <input type="text" id="assignmentCompany" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Company name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
                    <input type="text" id="assignmentRole" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Role" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                    <input type="datetime-local" id="assignmentStart" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
                    <input type="datetime-local" id="assignmentEnd" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateAssignment}
                  disabled={!hasApprovedRole}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Assignment
                </button>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Existing Assignments</p>
                {assignments.length === 0 ? (
                  <p className="text-sm text-gray-500">No assignments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{assignment.assignedCompany || '—'}</p>
                        <p className="text-xs text-gray-500">Role: {assignment.assignedRole || '—'}</p>
                        <p className="text-xs text-gray-500">Status: {formatStatusLabel(assignment.status)}</p>
                        <p className="text-xs text-gray-500">Start: {formatDate(assignment.startDate)}</p>
                        <p className="text-xs text-gray-500">End: {formatDate(assignment.endDate)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-purple-600" />
              Admin Notes
            </h2>
            {adminNotesMessage && (
              <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${adminNotesMessage.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {adminNotesMessage}
              </div>
            )}
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add admin notes here..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveAdminNotes}
                disabled={savingAdminNotes}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {savingAdminNotes && <Loader2 size={14} className="animate-spin" />}
                Save Notes
              </button>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-purple-600" />
              Activity Timeline
            </h2>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{log.action}</p>
                      {log.adminName && (
                        <p className="text-xs text-gray-500">By {log.adminName}</p>
                      )}
                      {log.reason && (
                        <p className="text-xs text-gray-600 mt-1">{log.reason}</p>
                      )}
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell size={20} className="text-purple-600" />
              Notifications
            </h2>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-3 rounded-lg border ${notif.isRead ? 'bg-gray-50 border-gray-100' : 'bg-purple-50 border-purple-200'}`}>
                    <p className="text-sm font-medium text-gray-900">{notif.title || notif.type}</p>
                    {notif.message && (
                      <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatDate(notif.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {application.resumeUrl && (
            <section className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-purple-600" />
                Resume / CV
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{application.resumeFilename || 'Resume'}</p>
                  {application.resumeSize && (
                    <p className="text-xs text-gray-500">{formatFileSize(application.resumeSize)}</p>
                  )}
                </div>
                <button
                  onClick={handleDownloadResume}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Application Summary</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Application ID</p>
                <p className="text-sm text-gray-900 font-mono">{application.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference Number</p>
                <p className="text-sm text-gray-900 font-mono">{application.referenceNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submission Date & Time</p>
                <p className="text-sm text-gray-900">{formatDate(application.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</p>
                <p className="text-sm text-gray-900">{formatDate(application.updatedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Overall Status</p>
                <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[overallStatus] || 'bg-gray-100 text-gray-800'}`}>
                  {formatStatusLabel(overallStatus)}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/admin/virtual-assistants/applications')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to List
              </button>
              {application.resumeUrl && (
                <button
                  onClick={handleDownloadResume}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download size={16} />
                  Download Resume
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default VirtualAssistantApplicationDetailPage;
