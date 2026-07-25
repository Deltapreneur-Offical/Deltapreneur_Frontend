import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  User,
  ListChecks,
  ClipboardList,
  Users,
  CalendarClock,
  Bell,
  Settings as SettingsIcon,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase,
  Globe,
  MapPin,
  Phone,
  Mail,
  Save,
  Check,
  IndianRupee,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import VaProfilePhoto from '../components/virtual-assistant/VaProfilePhoto';
import { virtualAssistantAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';

const ROLE_STATUS_DOT = { pending: '🟡', approved: '🟢', rejected: '🔴' };
const STATUS_BADGE = {
  pending: 'bg-gray-100 text-gray-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  inactive: 'bg-gray-100 text-gray-800',
};
const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'temporarily_unavailable', label: 'Temporarily Unavailable' },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'roles', label: 'My Roles', icon: ListChecks },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'availability', label: 'Availability', icon: CalendarClock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function fmtStatus(s) {
  return (s || '').replace(/_/g, ' ').replace('-', ' ');
}
function fmtDate(s) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return s;
  }
}

function StatCard({ label, value, icon, accent = 'text-indigo-600', bg = 'bg-indigo-50' }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${accent}`}>
        {Icon ? <Icon size={20} /> : null}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {title && <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>}
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );
}

function VirtualAssistantWorkspacePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [clients, setClients] = useState([]);
  const [availability, setAvailability] = useState({ availability: 'available', activeAssignments: 0, totalAssignments: 0 });
  const [notifications, setNotifications] = useState([]);
  const [notificationsError, setNotificationsError] = useState(false);
  const [settings, setSettings] = useState({ notificationsEnabled: true, emailNotifications: true, profileVisible: true, availability: 'available' });
  const [loading, setLoading] = useState(true);

  // editable profile form
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [languages, setLanguages] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [avail, setAvail] = useState('available');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        virtualAssistantAPI.getWorkspaceProfile(),
        virtualAssistantAPI.getWorkspaceRoles(),
        virtualAssistantAPI.getWorkspaceAssignments(),
        virtualAssistantAPI.getWorkspaceClients(),
        virtualAssistantAPI.getWorkspaceAvailability(),
        virtualAssistantAPI.getWorkspaceNotifications(),
        virtualAssistantAPI.getWorkspaceSettings(),
      ]);
      const [p, r, a, c, av, n, s] = results;

      if (p.status === 'fulfilled') {
        const prof = unwrapApiData(p.value) || {};
        setProfile(prof);
        setBio(prof.bio || '');
        setSkills(prof.skills || '');
        setLanguages(prof.languagesKnown || '');
        setPortfolioUrl(prof.portfolioUrl || '');
        setAvail(prof.availability || 'available');
      } else {
        console.error('Failed to load profile', p.reason);
      }

      if (r.status === 'fulfilled') {
        setRoles(unwrapApiData(r.value) || []);
      } else {
        console.error('Failed to load roles', r.reason);
      }

      if (a.status === 'fulfilled') {
        setAssignments(unwrapApiData(a.value) || []);
      } else {
        console.error('Failed to load assignments', a.reason);
      }

      if (c.status === 'fulfilled') {
        setClients(unwrapApiData(c.value) || []);
      } else {
        console.error('Failed to load clients', c.reason);
      }

      if (av.status === 'fulfilled') {
        setAvailability(unwrapApiData(av.value) || { availability: 'available', activeAssignments: 0, totalAssignments: 0 });
      } else {
        console.error('Failed to load availability', av.reason);
      }

      if (n.status === 'fulfilled') {
        setNotifications(unwrapApiData(n.value) || []);
        setNotificationsError(false);
      } else {
        console.error('Failed to load notifications', n.reason);
        setNotifications([]);
        setNotificationsError(true);
      }

      if (s.status === 'fulfilled') {
        setSettings(unwrapApiData(s.value) || settings);
      } else {
        console.error('Failed to load settings', s.reason);
      }
    } catch (e) {
      console.error('Failed to load VA workspace', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const onFocus = () => loadAll();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(loadAll, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [loadAll]);

  const saveProfile = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      await virtualAssistantAPI.updateWorkspaceProfile({
        bio,
        skills,
        languagesKnown: languages,
        portfolioUrl,
        availability: avail,
      });
      setSavedMsg('Profile updated successfully.');
      loadAll();
    } catch (e) {
      setSavedMsg('Failed to update profile.');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(''), 3000);
    }
  };

  const changeAvailability = async (value) => {
    setAvail(value);
    setAvailability((prev) => ({ ...prev, availability: value }));
    try {
      await virtualAssistantAPI.updateWorkspaceAvailability(value);
      loadAll();
    } catch (e) {
      /* no-op */
    }
  };

  const markRead = async (id) => {
    try {
      await virtualAssistantAPI.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n)));
    } catch (e) {
      /* no-op */
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await virtualAssistantAPI.updateWorkspaceSettings(settings);
      setSavedMsg('Settings saved.');
    } catch (e) {
      setSavedMsg('Failed to save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(''), 3000);
    }
  };

  const approvedRoles = roles.filter((r) => r.status === 'approved');
  const pendingRoles = roles.filter((r) => r.status === 'pending');
  const rejectedRoles = roles.filter((r) => r.status === 'rejected');
  const activeAssignments = assignments.filter((a) => a.status === 'active');
  const uniqueClients = new Set(
    clients.map((c) => `${(c.clientName || '').trim().toLowerCase()}|${(c.companyName || '').trim().toLowerCase()}`)
  ).size;
  const workspaceUnlocked = approvedRoles.length > 0;
  const currentAvailability = availability.availability || profile?.availability || avail;

  if (loading) return <AppLayout><Spinner /></AppLayout>;

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('vaWorkspaceTitle', { defaultValue: 'Virtual Assistant Workspace' })}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('vaWorkspaceSubtitle', { defaultValue: 'Manage your roles, assignments, clients and availability.' })}
            </p>
          </div>
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Loader2 size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {t(`vaTab${tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}`, { defaultValue: tab.label })}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Approved Roles" value={approvedRoles.length} icon={CheckCircle2} accent="text-green-600" bg="bg-green-50" />
              <StatCard label="Pending Roles" value={pendingRoles.length} icon={Clock} accent="text-yellow-600" bg="bg-yellow-50" />
              <StatCard label="Rejected Roles" value={rejectedRoles.length} icon={XCircle} accent="text-red-600" bg="bg-red-50" />
              <StatCard label="Active Assignments" value={activeAssignments.length} icon={ClipboardList} accent="text-indigo-600" bg="bg-indigo-50" />
              <StatCard label="Total Clients" value={uniqueClients} icon={Users} accent="text-purple-600" bg="bg-purple-50" />
              <StatCard label="Availability" value={fmtStatus(currentAvailability)} icon={CalendarClock} accent="text-teal-600" bg="bg-teal-50" />
            </div>
            <SectionCard title={t('vaWorkspaceStatus', { defaultValue: 'Workspace Status' })}>
              {!workspaceUnlocked ? (
                <div className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3">
                  <XCircle className="text-red-600" size={22} />
                  <span className="text-sm font-medium text-red-800">
                    {t('vaWorkspaceLocked', { defaultValue: 'Your Virtual Assistant Workspace is locked. At least one role must be approved to access it.' })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3">
                  <CheckCircle2 className="text-green-600" size={22} />
                  <span className="text-sm font-medium text-green-800">
                    {t('vaWorkspaceUnlocked', { defaultValue: 'Your Virtual Assistant Workspace is unlocked. At least one role has been approved.' })}
                  </span>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <SectionCard title={t('vaProfileInfo', { defaultValue: 'Profile Information' })}>
              <div className="flex items-center gap-4">
                <VaProfilePhoto
                  source={profile}
                  refreshScope="workspace"
                  alt=""
                  className="h-20 w-20 rounded-2xl object-cover"
                  fallbackClassName="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"
                  fallback="icon"
                  fallbackIcon={User}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{profile?.fullName}</h3>
                  <p className="text-sm text-gray-500">{profile?.location || '—'}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReadOnlyField icon={Mail} label="Email" value={profile?.email} />
                <ReadOnlyField icon={Phone} label="Phone" value={profile?.phoneNumber} />
                <ReadOnlyField icon={Globe} label="LinkedIn" value={profile?.linkedinUrl} href={profile?.linkedinUrl} />
                <ReadOnlyField icon={Globe} label="Portfolio" value={profile?.portfolioUrl} href={profile?.portfolioUrl} />
                <ReadOnlyField icon={Briefcase} label="Experience" value={profile?.yearsExperience} />
                <ReadOnlyField icon={IndianRupee} label="Customer Monthly Price" value={profile?.publicMonthlyPriceInr != null ? `${profile.pricingCurrency || 'INR'} ${profile.publicMonthlyPriceInr}` : 'Not set'} />
                <ReadOnlyField icon={CheckCircle2} label="Publishing Status" value={fmtStatus(profile?.publishStatus)} />
              </dl>
            </SectionCard>

            <SectionCard title={t('vaEditProfile', { defaultValue: 'Edit Profile' })}>
              <div className="space-y-4">
                <TextArea label="Short Bio" value={bio} onChange={setBio} />
                <Input label="Skills" value={skills} onChange={setSkills} placeholder="Comma separated" />
                <Input label="Languages" value={languages} onChange={setLanguages} placeholder="Comma separated" />
                <Input label="Portfolio Website" value={portfolioUrl} onChange={setPortfolioUrl} placeholder="https://" />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Availability</label>
                  <select
                    value={avail}
                    onChange={(e) => setAvail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {AVAILABILITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {t('vaSave', { defaultValue: 'Save' })}
                  </button>
                  {savedMsg && (
                    <span className="inline-flex items-center gap-1 text-sm text-green-600">
                      <Check size={14} /> {savedMsg}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {t('vaReadOnlyNote', { defaultValue: 'Name and Email are read-only. Change them from your main profile settings.' })}
                </p>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'roles' && (
          <SectionCard title={t('vaRolesTitle', { defaultValue: 'My Roles' })}>
            {roles.length === 0 ? (
              <Empty text="No roles selected." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {roles.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden>{ROLE_STATUS_DOT[r.status] || '🟡'}</span>
                      <span className="font-medium text-gray-900">{r.roleName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {r.status === 'approved' && r.reviewedAt && <span>Approved {fmtDate(r.reviewedAt)}</span>}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-800'}`}>
                        {fmtStatus(r.status)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {activeTab === 'assignments' && (
          <SectionCard title={t('vaAssignmentsTitle', { defaultValue: 'Assignments' })}>
            {assignments.length === 0 ? (
              <Empty text="No assignments yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-3 px-3 font-semibold text-gray-700">Assigned Company</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Role</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Status</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Start</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id} className="border-b border-gray-100">
                        <td className="py-3 px-3 text-gray-900">{a.assignedCompany || '—'}</td>
                        <td className="py-3 px-3 text-gray-600">{a.assignedRole || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-800'}`}>{fmtStatus(a.status)}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{fmtDate(a.startDate)}</td>
                        <td className="py-3 px-3 text-gray-600">{fmtDate(a.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'clients' && (
          <SectionCard title={t('vaClientsTitle', { defaultValue: 'Clients' })}>
            {clients.length === 0 ? (
              <Empty text="No clients yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-3 px-3 font-semibold text-gray-700">Client Name</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Company</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Role</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <td className="py-3 px-3 text-gray-900">{c.clientName || '—'}</td>
                        <td className="py-3 px-3 text-gray-600">{c.companyName || '—'}</td>
                        <td className="py-3 px-3 text-gray-600">{c.assignedRole || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status] || 'bg-gray-100 text-gray-800'}`}>{fmtStatus(c.status)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'availability' && (
          <div className="space-y-6">
            <SectionCard title={t('vaAvailabilityTitle', { defaultValue: 'Availability' })}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Active Assignments" value={availability.activeAssignments} icon={ClipboardList} accent="text-indigo-600" bg="bg-indigo-50" />
                <StatCard label="Total Assignments" value={availability.totalAssignments} icon={Briefcase} accent="text-purple-600" bg="bg-purple-50" />
                <StatCard label="Max Client Capacity" value={availability.maxClientCapacity != null ? availability.maxClientCapacity : '—'} icon={Users} accent="text-orange-600" bg="bg-orange-50" />
                <StatCard label="Current Client Count" value={availability.currentClientCount != null ? availability.currentClientCount : '—'} icon={User} accent="text-teal-600" bg="bg-teal-50" />
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Current Status</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => changeAvailability(o.value)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        avail === o.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'notifications' && (
          <SectionCard title={t('vaNotificationsTitle', { defaultValue: 'Notifications' })}>
            {notificationsError ? (
              <p className="text-sm text-red-600">Unable to load notifications.</p>
            ) : notifications.length === 0 ? (
              <Empty text="No notifications available." />
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => {
                  const isRead = Boolean(n.read || n.isRead);
                  const titleText = (n.title || fmtStatus(n.type) || '').trim();
                  const messageText = (n.message || '').trim();
                  const normTitle = titleText.replace(/\.+$/, '').trim().toLowerCase();
                  const normMsg = messageText.replace(/\.+$/, '').trim().toLowerCase();
                  const showMessage = Boolean(messageText) && normMsg !== normTitle;

                  return (
                    <li
                      key={n.id}
                      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
                        isRead ? 'border-gray-100 bg-white' : 'border-indigo-100 bg-indigo-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{titleText}</p>
                        {showMessage && <p className="text-sm text-gray-600">{messageText}</p>}
                        <p className="mt-1 text-xs text-gray-400">{fmtDate(n.createdAt)}</p>
                      </div>
                      {!isRead && (
                        <button onClick={() => markRead(n.id)} className="text-xs font-medium text-indigo-600 hover:underline">
                          {t('vaMarkRead', { defaultValue: 'Mark read' })}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        )}

        {activeTab === 'settings' && (
          <SectionCard title={t('vaSettingsTitle', { defaultValue: 'Settings' })}>
            <div className="space-y-4">
              <Toggle label="Enable Notifications" checked={settings.notificationsEnabled} onChange={(v) => setSettings((s) => ({ ...s, notificationsEnabled: v }))} />
              <Toggle label="Email Notifications" checked={settings.emailNotifications} onChange={(v) => setSettings((s) => ({ ...s, emailNotifications: v }))} />
              <Toggle label="Profile Visibility" checked={settings.profileVisible} onChange={(v) => setSettings((s) => ({ ...s, profileVisible: v }))} />
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Default Availability</label>
                <select
                  value={avail}
                  onChange={(e) => changeAvailability(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {AVAILABILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('vaSave', { defaultValue: 'Save' })}
              </button>
            </div>
          </SectionCard>
        )}
      </div>
    </AppLayout>
  );
}

function ReadOnlyField({ icon: Icon, label, value, href }) {
  const content = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{value || '—'}</a>
  ) : (
    <span className="text-gray-900">{value || '—'}</span>
  );
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Icon size={13} /> {label}
      </dt>
      <dd className="mt-1 text-sm">{content}</dd>
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function Empty({ text }) {
  return <p className="py-8 text-center text-sm text-gray-500">{text}</p>;
}

export default VirtualAssistantWorkspacePage;
