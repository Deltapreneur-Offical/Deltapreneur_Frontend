import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, XCircle, Clock, User, Mail, Phone, MapPin,
  Briefcase, FileText, Globe, Clock3, IndianRupee, Loader2, Hash, Calendar,
  RefreshCw, Link2, Languages, Sparkles, Users, BadgeCheck,
} from 'lucide-react';
import { adminAPI } from '../api/services';
import { unwrapApiData, unwrapApiList } from '../utils/apiResponse';
import { readApiError } from '../utils/apiError';
import { formatVaReferenceNumber, vaDisplayApplicationNumber, hasVaProfilePhoto } from '../utils/virtualAssistantDisplay';
import { vaAdminApplicationsPath } from '../utils/virtualAssistantAdminNav';
import { useCurrency } from '../context/CurrencyContext';
import { convertPrice as convertInrToForeign } from '../utils/currencyDisplay';
import CurrencyPriceInput from '../components/common/CurrencyPriceInput';
import VaProfilePhoto from '../components/virtual-assistant/VaProfilePhoto';
import '../styles/virtual-assistant-application-detail.css';

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

function toChips(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function SectionCard({ icon: Icon, title, children, className = '', action = null, subtitle = null }) {
  return (
    <section className={`va-detail-card ${className}`.trim()}>
      <div className="va-detail-card__header">
        <div className="va-detail-card__heading">
          <span className="va-detail-card__icon">
            <Icon size={18} />
          </span>
          <div>
            <h2 className="va-detail-card__title">{title}</h2>
            {subtitle ? <p className="va-detail-card__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoItem({ icon: Icon, label, children, className = '' }) {
  return (
    <div className={`va-detail-info-item ${className}`.trim()}>
      <span className="va-detail-info-item__icon">
        <Icon size={16} />
      </span>
      <div className="va-detail-info-item__body">
        <span className="va-detail-info-item__label">{label}</span>
        <div className="va-detail-info-item__value">{children}</div>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, children, mono = false }) {
  return (
    <div className="va-detail-summary-row">
      <span className="va-detail-summary-row__icon">
        <Icon size={15} />
      </span>
      <div>
        <span className="va-detail-summary-row__label">{label}</span>
        <div className={`va-detail-summary-row__value${mono ? ' va-detail-summary-row__value--mono' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ChipList({ items, empty = '—', neutral = false }) {
  if (!items.length) return <span>{empty}</span>;
  return (
    <div className="va-detail-chips">
      {items.map((item) => (
        <span key={item} className={`va-detail-chip${neutral ? ' va-detail-chip--neutral' : ''}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function StatPill({ label, value, tone = 'default' }) {
  return (
    <div className={`va-detail-stat-pill va-detail-stat-pill--${tone}`}>
      <span className="va-detail-stat-pill__label">{label}</span>
      <span className="va-detail-stat-pill__value">{value}</span>
    </div>
  );
}

function VirtualAssistantApplicationDetailPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { convertToInr, ratesMeta } = useCurrency();

  const [application, setApplication] = useState(null);
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [roleNotes, setRoleNotes] = useState({});
  const [error, setError] = useState('');
  const [roleMessage, setRoleMessage] = useState('');
  const [pricing, setPricing] = useState({ publicMonthlyPriceInr: '', pricingCurrency: 'INR', maxClientCapacity: '' });
  const basePriceInrRef = useRef(null);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingMessage, setPricingMessage] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [capacityValues, setCapacityValues] = useState({});
  const [savingCapacityId, setSavingCapacityId] = useState(null);
  const [capacityMessage, setCapacityMessage] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setRoleMessage('');
    setPricingMessage('');
    setPublishMessage('');
    setCapacityMessage('');
    try {
      const [appRes, rolesRes] = await Promise.all([
        adminAPI.getVirtualAssistant(applicationId),
        adminAPI.getVirtualAssistantRoles(applicationId),
      ]);
      const appData = unwrapApiData(appRes);
      const rolesData = unwrapApiData(rolesRes) || [];
      setApplication(appData);
      setRoles(rolesData);
      setAssignments([]);
      const initialNotes = {};
      rolesData.forEach((r) => {
        if (r.rejectionNote) initialNotes[r.id] = r.rejectionNote;
      });
      setRoleNotes(initialNotes);
      if (appData) {
        const baseInr = appData.publicMonthlyPriceInr ?? '';
        basePriceInrRef.current = baseInr === '' ? 0 : Number(baseInr);
        setPricing({
          publicMonthlyPriceInr: baseInr,
          pricingCurrency: appData.pricingCurrency || 'INR',
          maxClientCapacity: appData.maxClientCapacity ?? '',
        });
      }
    } catch (e) {
      console.error('Failed to load application detail', e);
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.response?.data?.error || 'Failed to load application details. Please try again.';
      setError(status ? `Error ${status}: ${detail}` : detail);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const refreshAll = useCallback(async () => {
    try {
      const [appRes, rolesRes, assignmentsRes] = await Promise.all([
        adminAPI.getVirtualAssistant(applicationId),
        adminAPI.getVirtualAssistantRoles(applicationId),
        adminAPI.getVirtualAssistantAssignments(applicationId),
      ]);
      const appData = unwrapApiData(appRes);
      const rolesData = unwrapApiData(rolesRes) || [];
      setApplication(appData);
      setRoles(rolesData);
      setAssignments(unwrapApiList(assignmentsRes));
      const initialNotes = {};
      rolesData.forEach((r) => {
        if (r.rejectionNote) initialNotes[r.id] = r.rejectionNote;
      });
      setRoleNotes(initialNotes);
      if (appData) {
        const baseInr = appData.publicMonthlyPriceInr ?? '';
        basePriceInrRef.current = baseInr === '' ? 0 : Number(baseInr);
        setPricing({
          publicMonthlyPriceInr: appData.publicMonthlyPriceInr ?? '',
          pricingCurrency: appData.pricingCurrency || 'INR',
          maxClientCapacity: appData.maxClientCapacity ?? '',
        });
      }
    } catch (e) {
      console.error('Failed to refresh data', e);
    }
  }, [applicationId]);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await adminAPI.getVirtualAssistantAssignments(applicationId);
      setAssignments(unwrapApiList(res));
    } catch (e) {
      console.error('Failed to load assignments', e);
      setAssignments([]);
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
      const baseInr = application.publicMonthlyPriceInr ?? '';
      basePriceInrRef.current = baseInr === '' ? 0 : Number(baseInr);
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

  const handleViewResume = () => {
    if (!application?.resumeUrl) return;
    window.open(application.resumeUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDisplayedPriceChange = (value) => {
    const currency = pricing.pricingCurrency || 'INR';
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      const inr = currency === 'INR' ? numericValue : convertToInr(numericValue, currency);
      basePriceInrRef.current = inr;
    } else {
      basePriceInrRef.current = 0;
    }
    setPricing((prev) => ({ ...prev, publicMonthlyPriceInr: value }));
  };

  const handlePricingCurrencyChange = (nextCurrency) => {
    const oldCurrency = pricing.pricingCurrency || 'INR';
    const baseInr = basePriceInrRef.current ?? 0;
    setPricing((prev) => ({ ...prev, pricingCurrency: nextCurrency }));
    if (oldCurrency === nextCurrency || Number.isNaN(baseInr) || baseInr <= 0) return;
    const converted = convertInrToForeign(baseInr, nextCurrency, ratesMeta);
    if (converted != null && Number.isFinite(converted)) {
      setPricing((prev) => ({ ...prev, publicMonthlyPriceInr: String(Math.round(converted * 100) / 100) }));
    }
  };

  const handlePricingUpdate = async (e) => {
    e.preventDefault();
    setSavingPricing(true);
    setPricingMessage('');
    try {
      const displayAmount = pricing.publicMonthlyPriceInr === '' ? 0 : Number(pricing.publicMonthlyPriceInr);
      const inrAmount = pricing.pricingCurrency === 'INR'
        ? displayAmount
        : convertToInr(displayAmount, pricing.pricingCurrency);
      const priceValue = displayAmount === 0 ? null : Math.round(inrAmount * 100) / 100;
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
    const company = document.getElementById('assignmentCompany')?.value?.trim();
    const role = document.getElementById('assignmentRole')?.value?.trim();
    const start = document.getElementById('assignmentStart')?.value;
    const end = document.getElementById('assignmentEnd')?.value;
    if (!company || !role) {
      setCapacityMessage('Company and role are required.');
      return;
    }
    if (start && end && new Date(end) < new Date(start)) {
      setCapacityMessage('End date must be on or after start date.');
      return;
    }
    setCapacityMessage('');
    try {
      await adminAPI.createVirtualAssistantAssignment(applicationId, {
        assignedCompany: company,
        assignedRole: role,
        startDate: start || null,
        endDate: end || null,
        notes: null,
      });
      setCapacityMessage('Assignment created successfully.');
      document.getElementById('assignmentCompany').value = '';
      document.getElementById('assignmentRole').value = '';
      document.getElementById('assignmentStart').value = '';
      document.getElementById('assignmentEnd').value = '';
      await fetchAssignments();
    } catch (e) {
      console.error('Failed to create assignment', e);
      setCapacityMessage(readApiError(e, 'Failed to create assignment.'));
    }
  };

  const overallStatus = application?.overallStatus || application?.status || 'pending';
  const hasApprovedRole = roles.some((r) => r.status === 'approved');
  const canPublish = hasApprovedRole && application?.publicMonthlyPriceInr != null && application?.maxClientCapacity != null;
  const skillChips = toChips(application?.skills);
  const languageChips = toChips(application?.languagesKnown);
  const approvedRoleCount = roles.filter((r) => r.status === 'approved').length;
  const pendingRoleCount = roles.filter((r) => r.status === 'pending').length;
  const publishTone =
    application?.publishStatus === 'published' ? 'success' :
    application?.publishStatus === 'unpublished' ? 'danger' : 'warning';
  const publishLabel =
    application?.publishStatus === 'published' ? 'Published' :
    application?.publishStatus === 'unpublished' ? 'Unpublished' : 'Draft';
  const publicPriceLabel =
    application?.publicMonthlyPriceInr != null
      ? `${application.pricingCurrency || 'INR'} ${Number(application.publicMonthlyPriceInr).toLocaleString('en-IN')}/mo`
      : 'Not set';

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
          onClick={() => navigate(vaAdminApplicationsPath())}
          className="va-detail-btn va-detail-btn--primary"
          style={{ width: 'auto', margin: '0 auto', paddingInline: '1.25rem' }}
        >
          <ArrowLeft size={16} />
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page va-detail-page" data-admin-section="virtual-assistants">
      <div className="va-detail-topbar">
        <button
          type="button"
          onClick={() => navigate(vaAdminApplicationsPath())}
          className="va-detail-back"
          title="Back to Applications"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="va-detail-topbar__copy">
          <p className="va-detail-kicker">DeltaOperator Profile</p>
          <h1 className="va-detail-title">{application.fullName || 'Applicant Profile'}</h1>
          <p className="va-detail-subtitle">
            <code>{formatVaReferenceNumber(application.referenceNumber)}</code>
            <span className="va-detail-dot">·</span>
            App #{vaDisplayApplicationNumber(application)}
            <span className="va-detail-dot">·</span>
            Submitted {formatDate(application.createdAt)}
          </p>
        </div>
      </div>

      <section className="va-detail-hero">
        <div className="va-detail-hero__identity">
          <VaProfilePhoto
            source={application}
            applicationId={application.id}
            refreshScope="admin"
            alt=""
            className="va-detail-avatar"
            fallbackClassName="va-detail-avatar va-detail-avatar--fallback"
            fallback="icon"
          />
          <div className="va-detail-hero__meta">
            <div className="va-detail-hero__name-row">
              <h2 className="va-detail-hero__name">{application.fullName || '—'}</h2>
              <span className={`va-detail-badge ${STATUS_BADGE_CLASSES[overallStatus] || 'bg-gray-100 text-gray-800'}`}>
                {formatStatusLabel(overallStatus)}
              </span>
              <span className={`va-detail-badge va-detail-badge--publish va-detail-badge--${publishTone}`}>
                {publishLabel}
              </span>
            </div>
            <div className="va-detail-hero__contacts">
              <span><Mail size={14} /> {application.email || '—'}</span>
              <span><Phone size={14} /> {application.phoneNumber || '—'}</span>
              <span><MapPin size={14} /> {application.location || '—'}</span>
            </div>
            <div className="va-detail-hero__tags">
              {application.yearsExperience ? (
                <span className="va-detail-soft-chip">{application.yearsExperience} experience</span>
              ) : null}
              {application.availability ? (
                <span className="va-detail-soft-chip">
                  {application.availability.replace(/_/g, ' ').replace(/-/g, ' ')}
                </span>
              ) : null}
              {application.hoursPerWeek ? (
                <span className="va-detail-soft-chip">{application.hoursPerWeek} hrs/week</span>
              ) : null}
              {roles.slice(0, 3).map((role) => (
                <span key={role.id} className="va-detail-soft-chip va-detail-soft-chip--role">
                  <span aria-hidden>{ROLE_STATUS_DOT[role.status] || '🟡'}</span>
                  {role.roleName}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="va-detail-hero__stats">
          <StatPill label="Overall" value={formatStatusLabel(overallStatus)} tone={overallStatus === 'approved' ? 'success' : overallStatus === 'rejected' ? 'danger' : 'default'} />
          <StatPill label="Publish" value={publishLabel} tone={publishTone} />
          <StatPill label="Public Price" value={publicPriceLabel} />
          <StatPill label="Capacity" value={application.maxClientCapacity ?? '—'} />
          <StatPill label="Roles" value={`${approvedRoleCount}/${roles.length || 0} approved`} tone={approvedRoleCount > 0 ? 'success' : 'default'} />
          <StatPill label="Pending Roles" value={pendingRoleCount} tone={pendingRoleCount > 0 ? 'warning' : 'default'} />
        </div>
      </section>

      <div className="va-detail-layout">
        <div className="va-detail-main">
          <SectionCard
            icon={User}
            title="About the Applicant"
            subtitle="Profile snapshot for quick review"
          >
            {application.bio ? (
              <div className="va-detail-bio">
                <span className="va-detail-bio__label">Short Bio</span>
                <p className="va-detail-bio__text">{application.bio}</p>
              </div>
            ) : (
              <p className="va-detail-empty">No bio provided.</p>
            )}

            <div className="va-detail-profile-grid">
              <div className="va-detail-profile-block">
                <h3 className="va-detail-profile-block__title">Skills & Languages</h3>
                <div className="va-detail-info-grid">
                  <InfoItem icon={Sparkles} label="Skills" className="va-detail-info-item--span-2">
                    <ChipList items={skillChips} />
                  </InfoItem>
                  <InfoItem icon={Languages} label="Languages" className="va-detail-info-item--span-2">
                    <ChipList items={languageChips} neutral />
                  </InfoItem>
                </div>
              </div>

              <div className="va-detail-profile-block">
                <h3 className="va-detail-profile-block__title">Work Preferences</h3>
                <div className="va-detail-info-grid">
                  <InfoItem icon={Clock3} label="Years of Experience">
                    {application.yearsExperience || '—'}
                  </InfoItem>
                  <InfoItem icon={Clock} label="Availability">
                    {application.availability
                      ? application.availability.replace(/_/g, ' ').replace(/-/g, ' ')
                      : '—'}
                  </InfoItem>
                  <InfoItem icon={Calendar} label="Hours / Week">
                    {application.hoursPerWeek || '—'}
                  </InfoItem>
                  <InfoItem icon={IndianRupee} label="Expected (Private)">
                    {application.expectedCompensation || '—'}
                  </InfoItem>
                </div>
              </div>

              <div className="va-detail-profile-block">
                <h3 className="va-detail-profile-block__title">Contact & Links</h3>
                <div className="va-detail-info-grid">
                  <InfoItem icon={Mail} label="Email">{application.email || '—'}</InfoItem>
                  <InfoItem icon={Phone} label="Phone">{application.phoneNumber || '—'}</InfoItem>
                  <InfoItem icon={MapPin} label="Location">{application.location || '—'}</InfoItem>
                  <InfoItem icon={Globe} label="LinkedIn">
                    {application.linkedinUrl ? (
                      <a href={application.linkedinUrl} target="_blank" rel="noopener noreferrer">
                        View LinkedIn
                      </a>
                    ) : '—'}
                  </InfoItem>
                  <InfoItem icon={Link2} label="Portfolio / Website" className="va-detail-info-item--span-2">
                    {application.portfolioUrl ? (
                      <a href={application.portfolioUrl} target="_blank" rel="noopener noreferrer">
                        View Portfolio
                      </a>
                    ) : '—'}
                  </InfoItem>
                </div>
              </div>
            </div>
          </SectionCard>

          {(application.resumeUrl || hasVaProfilePhoto(application)) && (
            <SectionCard icon={FileText} title="Documents" subtitle="Uploaded with the application">
              <div className="va-detail-docs-grid">
                {application.resumeUrl && (
                  <div className="va-detail-doc">
                    <div className="va-detail-doc__info">
                      <span className="va-detail-doc__icon">
                        <FileText size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{application.resumeFilename || 'Resume / CV'}</p>
                        {application.resumeSize != null && (
                          <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(application.resumeSize)}</p>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={handleViewResume} className="va-detail-btn va-detail-btn--primary va-detail-btn--sm">
                      <FileText size={14} />
                      View Resume
                    </button>
                  </div>
                )}
                {hasVaProfilePhoto(application) && (
                  <div className="va-detail-doc">
                    <div className="va-detail-doc__info">
                      <span className="va-detail-doc__icon">
                        <User size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Profile Photo</p>
                        <p className="text-xs text-gray-500 mt-0.5">Uploaded with application</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard
            icon={BadgeCheck}
            title="Applied Roles"
            subtitle="Review and decide per role"
            action={
              <span className="va-detail-count-pill">
                {roles.length} role{roles.length === 1 ? '' : 's'}
              </span>
            }
          >
            {roleMessage && (
              <div className={`va-detail-alert ${roleMessage.includes('success') ? 'va-detail-alert--success' : 'va-detail-alert--error'}`}>
                {roleMessage}
              </div>
            )}
            {capacityMessage && /capacit/i.test(capacityMessage) && (
              <div className={`va-detail-alert ${capacityMessage.includes('success') ? 'va-detail-alert--success' : 'va-detail-alert--error'}`}>
                {capacityMessage}
              </div>
            )}
            {roles.length === 0 ? (
              <p className="va-detail-empty">No roles specified.</p>
            ) : (
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className={`va-detail-role-card va-detail-role-card--${role.status || 'pending'}`}>
                    <div className="va-detail-role-card__body">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span aria-hidden className="text-base leading-none">{ROLE_STATUS_DOT[role.status] || '🟡'}</span>
                            <p className="text-sm sm:text-base font-semibold text-gray-900 tracking-tight">{role.roleName}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE_CLASSES[role.status] || 'bg-gray-100 text-gray-800'}`}>
                              {formatStatusLabel(role.status)}
                            </span>
                          </div>
                          {(role.reviewedBy || role.reviewedAt) && (
                            <p className="text-xs text-gray-500">
                              {role.reviewedBy ? `Reviewed by ${role.reviewedBy}` : 'Reviewed'}
                              {role.reviewedAt ? ` · ${formatDate(role.reviewedAt)}` : ''}
                            </p>
                          )}
                          {role.rejectionNote && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                              Note: {role.rejectionNote}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100">
                              Max Clients: <span className="ml-1 font-semibold text-gray-800">{role.maxClients ?? '—'}</span>
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100">
                              Current Clients: <span className="ml-1 font-semibold text-gray-800">{role.currentClients ?? 0}</span>
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-medium ${
                              role.availabilityStatus === 'available' ? 'bg-green-50 text-green-700 border border-green-100' :
                              role.availabilityStatus === 'limited' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                              role.availabilityStatus === 'not_available' ? 'bg-red-50 text-red-700 border border-red-100' :
                              'bg-gray-50 text-gray-700 border border-gray-100'
                            }`}>
                              {formatStatusLabel(role.availabilityStatus)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRoleUpdate(role.id, 'approved')}
                            disabled={savingRoleId === role.id || role.status === 'approved'}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 disabled:opacity-50 disabled:cursor-default transition-colors"
                            title="Approve this role"
                          >
                            {savingRoleId === role.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRoleUpdate(role.id, 'rejected')}
                            disabled={savingRoleId === role.id || role.status === 'rejected'}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-default transition-colors"
                            title="Reject this role"
                          >
                            {savingRoleId === role.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRoleUpdate(role.id, 'pending')}
                            disabled={savingRoleId === role.id || role.status === 'pending'}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default transition-colors"
                            title="Set as pending"
                          >
                            {savingRoleId === role.id ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                            Pending
                          </button>
                        </div>
                      </div>

                      {role.status === 'rejected' && (
                        <div>
                          <label className="va-detail-field-label">Rejection note</label>
                          <textarea
                            value={roleNotes[role.id] || ''}
                            onChange={(e) => setRoleNotes((prev) => ({ ...prev, [role.id]: e.target.value }))}
                            placeholder="Rejection note (optional)"
                            rows={2}
                            className="va-detail-textarea"
                          />
                        </div>
                      )}

                      <div className="pt-3 border-t border-gray-100">
                        <p className="va-detail-field-label mb-2">Role Capacity</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="va-detail-field-label">Max Clients</label>
                            <input
                              type="number"
                              min="0"
                              value={capacityValues[role.id]?.maxClients ?? ''}
                              onChange={(e) => setCapacityValues((prev) => ({ ...prev, [role.id]: { ...prev[role.id], maxClients: e.target.value } }))}
                              className="va-detail-input"
                            />
                          </div>
                          <div>
                            <label className="va-detail-field-label">Current Clients</label>
                            <input
                              type="number"
                              min="0"
                              value={capacityValues[role.id]?.currentClients ?? 0}
                              onChange={(e) => setCapacityValues((prev) => ({ ...prev, [role.id]: { ...prev[role.id], currentClients: e.target.value } }))}
                              className="va-detail-input"
                            />
                          </div>
                          <div>
                            <label className="va-detail-field-label">Active</label>
                            <select
                              value={capacityValues[role.id]?.isActive ? 'true' : 'false'}
                              onChange={(e) => setCapacityValues((prev) => ({ ...prev, [role.id]: { ...prev[role.id], isActive: e.target.value === 'true' } }))}
                              className="va-detail-select"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => handleCapacityUpdate(role.id)}
                            disabled={savingCapacityId === role.id}
                            className="va-detail-btn va-detail-btn--primary va-detail-btn--sm"
                          >
                            {savingCapacityId === role.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Save Capacity
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Users} title="Assignments" subtitle="Place this VA on client work">
            {capacityMessage && !/capacit/i.test(capacityMessage) && (
              <div className={`va-detail-alert ${capacityMessage.includes('success') ? 'va-detail-alert--success' : 'va-detail-alert--error'}`}>
                {capacityMessage}
              </div>
            )}
            <div className="space-y-4">
              {!hasApprovedRole ? (
                <p className="va-detail-empty">No approved roles yet. Approve a role to create assignments.</p>
              ) : (
                <div className="va-detail-assignment-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="va-detail-field-label">Company</label>
                      <input type="text" id="assignmentCompany" className="va-detail-input" placeholder="Company name" />
                    </div>
                    <div>
                      <label className="va-detail-field-label">Role</label>
                      <input type="text" id="assignmentRole" className="va-detail-input" placeholder="Role" />
                    </div>
                    <div>
                      <label className="va-detail-field-label">Start Date</label>
                      <input type="datetime-local" id="assignmentStart" className="va-detail-input" />
                    </div>
                    <div>
                      <label className="va-detail-field-label">End Date</label>
                      <input type="datetime-local" id="assignmentEnd" className="va-detail-input" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleCreateAssignment}
                      disabled={!hasApprovedRole}
                      className="va-detail-btn va-detail-btn--primary va-detail-btn--sm"
                    >
                      Create Assignment
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p className="va-detail-field-label">Existing Assignments</p>
                {assignments.length === 0 ? (
                  <p className="va-detail-empty">No assignments yet.</p>
                ) : (
                  <div className="va-detail-assignment-list">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="va-detail-assignment-card">
                        <div className="va-detail-assignment-card__top">
                          <p className="text-sm font-semibold text-gray-900">{assignment.assignedCompany || '—'}</p>
                          <span className={`va-detail-badge ${STATUS_BADGE_CLASSES[assignment.status] || 'bg-gray-100 text-gray-800'}`}>
                            {formatStatusLabel(assignment.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Role: {assignment.assignedRole || '—'}</p>
                        <div className="va-detail-assignment-card__dates">
                          <span>Start: {formatDate(assignment.startDate)}</span>
                          <span>End: {formatDate(assignment.endDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="va-detail-aside">
          <SectionCard icon={Check} title="Lifecycle Status" subtitle="Set overall application state">
            <div className="va-detail-status-panel">
              <span className={`va-detail-badge va-detail-badge--lg ${STATUS_BADGE_CLASSES[overallStatus] || 'bg-gray-100 text-gray-800'}`}>
                {formatStatusLabel(overallStatus)}
              </span>
              <p className="text-xs text-gray-500 mt-2 mb-3">
                Current lifecycle status for this application.
              </p>
              <div className="va-detail-status-actions">
                {['pending', 'under_review', 'partially_approved', 'approved', 'rejected'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusUpdate(application.id, s)}
                    disabled={overallStatus === s}
                    className={`va-detail-status-chip-btn${overallStatus === s ? ' va-detail-status-chip-btn--active' : ''}`}
                  >
                    {formatStatusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={IndianRupee} title="Pricing Management" subtitle="Public marketplace settings">
            {pricingMessage && (
              <div className={`va-detail-alert ${pricingMessage.includes('success') ? 'va-detail-alert--success' : 'va-detail-alert--error'}`}>
                {pricingMessage}
              </div>
            )}
            <form onSubmit={handlePricingUpdate} className="va-detail-ops-form">
              <div className="va-detail-ops-readonly">
                <span className="va-detail-field-label">Expected Compensation (Private)</span>
                <p className="va-detail-ops-readonly__value">
                  <IndianRupee size={14} />
                  {application.expectedCompensation || '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Visible only to administrators.</p>
              </div>
              <div>
                <label className="va-detail-field-label">Customer Monthly Price (Public)</label>
                <CurrencyPriceInput
                  id="admin-public-monthly-price"
                  label=""
                  value={pricing.publicMonthlyPriceInr}
                  onChange={(v) => handleDisplayedPriceChange(v)}
                  currency={pricing.pricingCurrency}
                  onCurrencyChange={handlePricingCurrencyChange}
                  required
                  placeholder={`Enter public price in ${pricing.pricingCurrency}`}
                  inputClassName="va-detail-input"
                  labelClassName="sr-only"
                  selectClassName="va-detail-select"
                />
              </div>
              <div>
                <label className="va-detail-field-label">Max Client Capacity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricing.maxClientCapacity}
                  onChange={(e) => setPricing((prev) => ({ ...prev, maxClientCapacity: e.target.value }))}
                  placeholder="Max clients"
                  className="va-detail-input"
                />
              </div>
              <div className="va-detail-ops-footer">
                <div className="text-xs text-gray-500">
                  {application.pricingUpdatedById && (
                    <span>Last updated: {formatDate(application.pricingUpdatedAt)} by Admin</span>
                  )}
                </div>
                <button type="submit" disabled={savingPricing} className="va-detail-btn va-detail-btn--primary va-detail-btn--sm">
                  {savingPricing && <Loader2 size={14} className="animate-spin" />}
                  Save Pricing
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard icon={Globe} title="Publishing" subtitle="Marketplace visibility">
            {publishMessage && (
              <div className={`va-detail-alert ${publishMessage.includes('success') || publishMessage.includes('published') || publishMessage.includes('unpublished') || publishMessage.includes('draft') ? 'va-detail-alert--success' : 'va-detail-alert--error'}`}>
                {publishMessage}
              </div>
            )}
            <div className="va-detail-publish-panel">
              <span className={`va-detail-badge va-detail-badge--lg va-detail-badge--${publishTone}`}>
                {publishLabel}
              </span>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                {application.publishedAt && <p>Published: {formatDate(application.publishedAt)}</p>}
                {application.publishedByName && <p>By: {application.publishedByName}</p>}
                {!canPublish && (
                  <p className="text-amber-600">Requires an approved role, public price, and capacity.</p>
                )}
              </div>
              <div className="va-detail-publish-actions">
                <button
                  type="button"
                  onClick={() => handlePublishAction('publish')}
                  disabled={publishLoading || application.publishStatus === 'published' || !canPublish}
                  className="va-detail-btn va-detail-btn--success va-detail-btn--sm"
                  title={!canPublish ? 'At least one approved role, pricing, and capacity are required to publish.' : ''}
                >
                  {publishLoading && <Loader2 size={14} className="animate-spin" />}
                  Publish Profile
                </button>
                <button
                  type="button"
                  onClick={() => handlePublishAction('unpublish')}
                  disabled={publishLoading || application.publishStatus === 'unpublished'}
                  className="va-detail-btn va-detail-btn--danger va-detail-btn--sm"
                >
                  {publishLoading && <Loader2 size={14} className="animate-spin" />}
                  Unpublish
                </button>
                <button
                  type="button"
                  onClick={() => handlePublishAction('draft')}
                  disabled={publishLoading || application.publishStatus === 'draft'}
                  className="va-detail-btn va-detail-btn--ghost va-detail-btn--sm"
                >
                  Save as Draft
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Hash} title="Application Summary">
            <SummaryRow icon={Hash} label="Application No." mono>
              {vaDisplayApplicationNumber(application)}
            </SummaryRow>
            <SummaryRow icon={FileText} label="Reference" mono>
              {formatVaReferenceNumber(application.referenceNumber)}
            </SummaryRow>
            <SummaryRow icon={Calendar} label="Submitted">
              {formatDate(application.createdAt)}
            </SummaryRow>
            <SummaryRow icon={RefreshCw} label="Updated">
              {formatDate(application.updatedAt)}
            </SummaryRow>
            <SummaryRow icon={Check} label="Current Status">
              <span className={`inline-flex items-center mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE_CLASSES[overallStatus] || 'bg-gray-100 text-gray-800'}`}>
                {formatStatusLabel(overallStatus)}
              </span>
            </SummaryRow>
          </SectionCard>

          <SectionCard icon={Briefcase} title="Quick Actions">
            <div className="va-detail-actions">
              <button
                type="button"
                onClick={() => navigate(vaAdminApplicationsPath())}
                className="va-detail-btn va-detail-btn--secondary"
              >
                <ArrowLeft size={16} />
                Back to List
              </button>
              {application.resumeUrl && (
                <button
                  type="button"
                  onClick={handleViewResume}
                  className="va-detail-btn va-detail-btn--primary"
                >
                  <FileText size={16} />
                  View Resume
                </button>
              )}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

export default VirtualAssistantApplicationDetailPage;
