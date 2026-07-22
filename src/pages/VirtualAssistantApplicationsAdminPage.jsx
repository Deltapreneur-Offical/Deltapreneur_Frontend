import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, ChevronLeft, ChevronRight, X, Download, User, Mail, Phone, MapPin, Briefcase, FileText, Globe, Clock, IndianRupee, Filter, Check, XCircle, Loader2, Trash2 } from 'lucide-react';
import StatusFilterBar from '../components/admin/StatusFilterBar';
import { adminAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';

const STATUS_CONFIG = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'partially_approved', label: 'Partially Approved' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

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

function VirtualAssistantApplicationsAdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ all: 0, pending: 0, under_review: 0, partially_approved: 0, approved: 0, rejected: 0 });
  const [profilePhotoError, setProfilePhotoError] = useState({});

  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedAppRoles, setSelectedAppRoles] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [roleNotes, setRoleNotes] = useState({});

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchCounts = useCallback(async () => {
    try {
      const response = await adminAPI.getVirtualAssistantCounts();
      setCounts(unwrapApiData(response) || {});
    } catch (e) {
      console.error('Failed to load counts', e);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      if (roleFilter.trim()) params.role_filter = roleFilter.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await adminAPI.getVirtualAssistants(params);
      const result = unwrapApiData(response) || { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      setItems(result.items || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 0);
      if (result.page && result.page !== page) {
        setPage(result.page);
      }
    } catch (e) {
      console.error('Failed to load applications', e);
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search, roleFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchCounts(), fetchData()]);
  }, [fetchCounts, fetchData]);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeletingId(deleteConfirmId);
    setDeleteError('');
    try {
      await adminAPI.deleteVirtualAssistant(deleteConfirmId);
      setDeleteConfirmId(null);
      refreshAll();
    } catch (e) {
      setDeleteError('Failed to delete application. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const handleDateFromChange = (e) => {
    setDateFrom(e.target.value);
    setPage(1);
  };

  const handleDateToChange = (e) => {
    setDateTo(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRoleFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'all' || roleFilter || dateFrom || dateTo;

  const getCounts = () => ({
    all: counts.all ?? items.length,
    pending: counts.pending ?? 0,
    under_review: counts.under_review ?? 0,
    partially_approved: counts.partially_approved ?? 0,
    approved: counts.approved ?? 0,
    rejected: counts.rejected ?? 0,
  });

  const pageNumbers = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (page < totalPages - 2) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  return (
    <div className="admin-page" data-admin-section="virtual-assistants">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Admin Dashboard"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Virtual Assistant Applications</h1>
            <p className="text-sm text-gray-500 mt-1">Review and manage all submitted Virtual Assistant applications</p>
          </div>
        </div>
      </div>

      <StatusFilterBar
        config={STATUS_CONFIG}
        activeStatus={statusFilter}
        counts={getCounts()}
        onFilterChange={handleStatusChange}
      />

      <div className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 bg-purple-600 rounded-full" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Applied Role</label>
                <input
                  type="text"
                  value={roleFilter}
                  onChange={handleRoleFilterChange}
                  placeholder="e.g. customer_support"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={handleDateFromChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={handleDateToChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <X size={14} />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No applications found.</div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Profile Photo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Applicant Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Applied Roles</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Overall Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Submission Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((app) => (
                  <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 font-mono text-xs">{app.referenceNumber || app.id}</td>
                    <td className="py-3 px-4">
                      {app.profilePhotoUrl && !profilePhotoError[app.id] ? (
                        <img
                          src={app.profilePhotoUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                          onError={() => setProfilePhotoError(prev => ({ ...prev, [app.id]: true }))}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <User size={18} className="text-purple-600" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{app.fullName}</td>
                    <td className="py-3 px-4 text-gray-600">{app.email}</td>
                    <td className="py-3 px-4 text-gray-600">{app.phoneNumber || '—'}</td>
                    <td className="py-3 px-4 text-gray-600">{app.location || '—'}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[200px]">
                      {app.roles ? (
                        <div className="flex flex-wrap gap-1">
                          {app.roles.split(',').slice(0, 2).map((role, i) => (
                            <span key={i} className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{role.trim()}</span>
                          ))}
                          {app.roles.split(',').length > 2 && (
                            <span className="text-xs text-gray-400">+{app.roles.split(',').length - 2} more</span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[app.overallStatus] || STATUS_BADGE_CLASSES[app.status] || 'bg-gray-100 text-gray-800'}`}>
                        {formatStatusLabel(app.overallStatus || app.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/virtual-assistants/applications/${app.id}`)}
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

          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-gray-200 gap-3">
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages} &middot; {total} total records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers.map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[2rem] h-8 px-2 text-sm font-medium rounded-lg transition-colors ${
                      page === p
                        ? 'bg-purple-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-sm font-medium border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
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
                  {selectedApp.profilePhotoUrl && !profilePhotoError[selectedApp.id] ? (
                    <img
                      src={selectedApp.profilePhotoUrl}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover"
                      onError={() => setProfilePhotoError(prev => ({ ...prev, [selectedApp.id]: true }))}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-purple-100 flex items-center justify-center">
                      <User size={32} className="text-purple-600" />
                    </div>
                  )}
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
                                {role.reviewedAt ? ` · ${formatDate(role.reviewedAt)}` : ''}
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
                    {['pending', 'under_review', 'partially_approved', 'accepted', 'rejected'].map((s) => (
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
}

export default VirtualAssistantApplicationsAdminPage;
