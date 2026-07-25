import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Eye, Download, X, User, Mail, Phone, MapPin, Briefcase, FileText, Globe, Clock, IndianRupee, Check, XCircle, Loader2, Trash2 } from 'lucide-react';
import StatusFilterBar from './StatusFilterBar';
import { adminAPI } from '../../api/services';
import { unwrapApiData } from '../../utils/apiResponse';
import VaProfilePhoto from '../virtual-assistant/VaProfilePhoto';

const STATUS_CONFIG = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'reviewing', label: 'Under Review' },
  { id: 'accepted', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'partially_approved', label: 'Partially Approved' },
];

const ROLE_STATUS_DOT = {
  pending: '🟡',
  approved: '🟢',
  rejected: '🔴',
};

function formatStatusLabel(status) {
  if (!status) return 'Pending';
  return status.replace('_', ' ').replace('-', ' ');
}

const VirtualAssistantsAdminTab = ({ data, loading, onRefresh }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedAppRoles, setSelectedAppRoles] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [roleNotes, setRoleNotes] = useState({});
  const [applications, setApplications] = useState(data || []);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchInternal = useCallback(async () => {
    if (data !== undefined && data !== null) return;
    try {
      const res = await adminAPI.getVirtualAssistants();
      const unwrapped = unwrapApiData(res);
      const list = Array.isArray(unwrapped) ? unwrapped : (unwrapped?.items || []);
      setApplications(list);
    } catch (e) {
      console.error('Failed to load VA applications', e);
    }
  }, [data]);

  useEffect(() => {
    if (data !== undefined && data !== null) {
      setApplications(data);
    } else {
      fetchInternal();
    }
  }, [data, fetchInternal]);

  const counts = useMemo(() => {
    const c = { all: applications.length };
    applications.forEach((app) => {
      const s = app.overallStatus || app.status || 'pending';
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [applications]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((app) => (app.overallStatus || app.status) === statusFilter);
  }, [applications, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const refreshAll = useCallback(async () => {
    onRefresh && onRefresh();
  }, [onRefresh]);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeletingId(deleteConfirmId);
    setDeleteError('');
    try {
      await adminAPI.deleteVirtualAssistant(deleteConfirmId);
      setApplications((prev) => prev.filter((app) => app.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      onRefresh && onRefresh();
    } catch (e) {
      setDeleteError('Failed to delete application. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const openDetail = async (appId) => {
    setDetailLoading(true);
    setSelectedApp(null);
    setSelectedAppRoles([]);
    setRoleNotes({});
    try {
      const [appRes, rolesRes] = await Promise.all([
        adminAPI.getVirtualAssistant(appId),
        adminAPI.getVirtualAssistantRoles(appId),
      ]);
      const appData = unwrapApiData(appRes);
      const rolesData = unwrapApiData(rolesRes) || [];
      setSelectedApp(appData);
      setSelectedAppRoles(rolesData);
      const initialNotes = {};
      rolesData.forEach((r) => {
        if (r.rejectionNote) initialNotes[r.id] = r.rejectionNote;
      });
      setRoleNotes(initialNotes);
    } catch (e) {
      console.error('Failed to load application detail', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRoleUpdate = async (roleId, newStatus) => {
    setSavingRoleId(roleId);
    try {
      const rejectionNote = newStatus === 'rejected' ? (roleNotes[roleId] || '') : undefined;
      const response = await adminAPI.updateVirtualAssistantRole(selectedApp.id, roleId, newStatus, rejectionNote);
      const updated = unwrapApiData(response);
      setSelectedAppRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, ...updated } : r)));
      const appRes = await adminAPI.getVirtualAssistant(selectedApp.id);
      const appData = unwrapApiData(appRes);
      setSelectedApp(appData);
      refreshAll();
    } catch (e) {
      console.error('Failed to update role', e);
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleStatusUpdate = async (appId, newStatus) => {
    try {
      await adminAPI.updateVirtualAssistantStatus(appId, newStatus);
      const appRes = await adminAPI.getVirtualAssistant(appId);
      const appData = unwrapApiData(appRes);
      setSelectedApp(appData);
      refreshAll();
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const handleDownloadResume = async (appId) => {
    try {
      const response = await adminAPI.downloadVirtualAssistantResume(appId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${appId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download resume', e);
    }
  };

  return (
    <div>
      <StatusFilterBar
        config={STATUS_CONFIG}
        activeStatus={statusFilter}
        counts={counts}
        onFilterChange={(s) => {
          setStatusFilter(s);
          setPage(1);
        }}
      />

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No applications found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Applicant</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Roles</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Submitted</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((app) => (
                <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <VaProfilePhoto
                        source={app}
                        applicationId={app.id}
                        refreshScope="admin"
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                        fallbackClassName="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"
                        fallback="icon"
                        fallbackIcon={User}
                        fallbackIconSize={18}
                        fallbackIconClassName="text-purple-600"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{app.fullName}</p>
                        <p className="text-xs text-gray-500">{app.phoneNumber || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{app.email}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                    {app.roles ? app.roles.split(',').slice(0, 2).join(', ') + (app.roles.split(',').length > 2 ? '...' : '') : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (app.overallStatus || app.status) === 'accepted' ? 'bg-green-100 text-green-800' :
                      (app.overallStatus || app.status) === 'rejected' ? 'bg-red-100 text-red-800' :
                      (app.overallStatus || app.status) === 'reviewing' ? 'bg-yellow-100 text-yellow-800' :
                      (app.overallStatus || app.status) === 'partially_approved' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {formatStatusLabel(app.overallStatus || app.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openDetail(app.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => { setDeleteConfirmId(app.id); setDeleteError(''); }}
                        disabled={deletingId === app.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Application Details</h3>
              <button onClick={() => { setSelectedApp(null); setSelectedAppRoles([]); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <VaProfilePhoto
                    source={selectedApp}
                    applicationId={selectedApp.id}
                    refreshScope="admin"
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover"
                    fallbackClassName="w-20 h-20 rounded-xl bg-purple-100 flex items-center justify-center"
                    fallback="icon"
                    fallbackIcon={User}
                    fallbackIconSize={32}
                    fallbackIconClassName="text-purple-600"
                  />
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{selectedApp.fullName}</h4>
                    <p className="text-sm text-gray-500">{selectedApp.referenceNumber}</p>
                    <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (selectedApp.overallStatus || selectedApp.status) === 'accepted' ? 'bg-green-100 text-green-800' :
                      (selectedApp.overallStatus || selectedApp.status) === 'rejected' ? 'bg-red-100 text-red-800' :
                      (selectedApp.overallStatus || selectedApp.status) === 'reviewing' ? 'bg-yellow-100 text-yellow-800' :
                      (selectedApp.overallStatus || selectedApp.status) === 'partially_approved' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {formatStatusLabel(selectedApp.overallStatus || selectedApp.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-900 flex items-center gap-2"><User size={16} /> Personal Information</h5>
                    <p className="text-sm text-gray-600"><Mail size={14} className="inline mr-2" />{selectedApp.email}</p>
                    <p className="text-sm text-gray-600"><Phone size={14} className="inline mr-2" />{selectedApp.phoneNumber || '—'}</p>
                    <p className="text-sm text-gray-600"><MapPin size={14} className="inline mr-2" />{selectedApp.location || '—'}</p>
                  </div>
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-900 flex items-center gap-2"><Briefcase size={16} /> Professional Information</h5>
                    <p className="text-sm text-gray-600"><strong>Bio:</strong> {selectedApp.bio || '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Skills:</strong> {selectedApp.skills || '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Experience:</strong> {selectedApp.yearsExperience || '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Languages:</strong> {selectedApp.languagesKnown || '—'}</p>
                    {selectedApp.linkedinUrl && <p className="text-sm text-gray-600"><Globe size={14} className="inline mr-2" /><a href={selectedApp.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">LinkedIn</a></p>}
                    {selectedApp.portfolioUrl && <p className="text-sm text-gray-600"><Globe size={14} className="inline mr-2" /><a href={selectedApp.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">Portfolio</a></p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={16} /> Work Information</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <p className="text-sm text-gray-600"><strong>Availability:</strong> {selectedApp.availability ? selectedApp.availability.replace('_', ' ').replace('-', ' ') : '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Hours/Week:</strong> {selectedApp.hoursPerWeek || '—'}</p>
                    <p className="text-sm text-gray-600"><IndianRupee size={14} className="inline mr-1" /><strong>Compensation:</strong> {selectedApp.expectedCompensation || '—'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900 flex items-center gap-2"><FileText size={16} /> Applied Roles</h5>
                  {selectedAppRoles.length === 0 ? (
                    <p className="text-sm text-gray-500">No roles specified.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedAppRoles.map((role) => (
                        <div key={role.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span aria-hidden className="text-base leading-none">{ROLE_STATUS_DOT[role.status] || '🟡'}</span>
                              <p className="text-sm font-semibold text-gray-900">{role.roleName}</p>
                            </div>
                            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              role.status === 'approved' ? 'bg-green-50 text-green-700' :
                              role.status === 'rejected' ? 'bg-red-50 text-red-700' :
                              'bg-yellow-50 text-yellow-800'
                            }`}>
                              {formatStatusLabel(role.status)}
                            </span>
                            {(role.reviewedBy || role.reviewedAt) && (
                              <p className="text-xs text-gray-500 mt-1">
                                {role.reviewedBy ? `Reviewed by ${role.reviewedBy}` : 'Reviewed'}
                                {role.reviewedAt ? ` · ${new Date(role.reviewedAt).toLocaleString()}` : ''}
                              </p>
                            )}
                            {role.rejectionNote && (
                              <p className="text-xs text-red-600 mt-1">Note: {role.rejectionNote}</p>
                            )}
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedApp.resumeUrl && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleDownloadResume(selectedApp.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download size={16} />
                      Download Resume
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h5 className="font-semibold text-gray-900 mb-3">Update Overall Status</h5>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'reviewing', 'accepted', 'rejected', 'partially_approved'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(selectedApp.id, s)}
                        disabled={(selectedApp.overallStatus || selectedApp.status) === s}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                          (selectedApp.overallStatus || selectedApp.status) === s
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500 hover:text-purple-600'
                        }`}
                      >
                        {formatStatusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Application</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to permanently delete this Virtual Assistant application?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteConfirmId(null); setDeleteError(''); }}
                disabled={deletingId === deleteConfirmId}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === deleteConfirmId}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {deletingId === deleteConfirmId ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualAssistantsAdminTab;
