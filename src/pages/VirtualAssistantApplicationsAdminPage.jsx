import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, ChevronLeft, ChevronRight, X, User, Filter, Check, XCircle, Loader2, Trash2, Users } from 'lucide-react';
import { adminAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import { vaDisplayReference } from '../utils/virtualAssistantDisplay';
import VaProfilePhoto from '../components/virtual-assistant/VaProfilePhoto';


const STATUS_BADGE = {
  pending:           { bg: 'bg-amber-50',   text: 'text-amber-700',  ring: 'ring-amber-200/60'  },
  under_review:      { bg: 'bg-blue-50',    text: 'text-blue-700',   ring: 'ring-blue-200/60'   },
  reviewing:         { bg: 'bg-blue-50',    text: 'text-blue-700',   ring: 'ring-blue-200/60'   },
  partially_approved:{ bg: 'bg-violet-50',  text: 'text-violet-700', ring: 'ring-violet-200/60' },
  approved:          { bg: 'bg-emerald-50', text: 'text-emerald-700',ring: 'ring-emerald-200/60'},
  accepted:          { bg: 'bg-emerald-50', text: 'text-emerald-700',ring: 'ring-emerald-200/60'},
  rejected:          { bg: 'bg-red-50',     text: 'text-red-700',    ring: 'ring-red-200/60'    },
};

/**
 * Applicant avatar — uses resolved profile photo URL with automatic refresh on load failure.
 */
function ApplicantAvatar({ app }) {
  return (
    <VaProfilePhoto
      source={app}
      applicationId={app?.id}
      refreshScope="admin"
      alt={app?.fullName || 'Applicant'}
      className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-md flex-shrink-0"
      fallbackClassName="w-11 h-11 rounded-full bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center ring-2 ring-white shadow-md flex-shrink-0 text-sm font-bold text-purple-700"
    />
  );
}

function StatusBadge({ status }) {
  const s = (status || 'pending').toLowerCase().replace(/-/g, '_');
  const cfg = STATUS_BADGE[s] || STATUS_BADGE.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring} whitespace-nowrap`}>
      {formatStatusLabel(status)}
    </span>
  );
}

function formatStatusLabel(status) {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ').replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr) {
  if (!dateStr) return 'â€”';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function StatCard({ label, value, colorClass, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3 transition-all text-left
        ${isActive
          ? '!bg-[#C2410C] border-[#C2410C] text-white ring-2 ring-[#C2410C]/30 shadow-md shadow-orange-100'
          : 'border-gray-100 hover:border-purple-300 hover:shadow-md'
        }
      `}
      aria-pressed={isActive}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-transparent' : colorClass}`}>
        <Users size={16} className="text-white" />
      </div>
      <div>
        <p className={`text-xl font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-900'}`}>{value ?? 0}</p>
        <p className={`text-[11px] mt-0.5 font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{label}</p>
      </div>
    </button>
  );
}

function VirtualAssistantApplicationsAdminPage({ embedded = false }) {
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

  const handleStatusChange = (newStatus) => { setStatusFilter(newStatus); setPage(1); };
  const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };
  const handleRoleFilterChange = (e) => { setRoleFilter(e.target.value); setPage(1); };
  const handleDateFromChange = (e) => { setDateFrom(e.target.value); setPage(1); };
  const handleDateToChange = (e) => { setDateTo(e.target.value); setPage(1); };

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setRoleFilter(''); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'all' || roleFilter || dateFrom || dateTo;

  const getCounts = () => ({
    all: counts.all ?? 0,
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
    <div className={embedded ? 'w-full min-w-0' : 'admin-page w-full min-w-0'} data-admin-section="virtual-assistants">
      <div className={embedded ? 'w-full' : 'w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6'}>

      {!embedded && (
      <div className="mb-7">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin?tab=operations&section=virtual-assistants&vaSubTab=applications')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-800"
            title="Back to DeltaOperators"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">DeltaOperator Applications</h1>
            <p className="text-sm text-gray-400 mt-0.5">Review and manage submitted DeltaOperator applications</p>
          </div>
        </div>
      </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total" value={getCounts().all} colorClass="bg-gradient-to-br from-violet-500 to-purple-600" isActive={statusFilter === 'all'} onClick={() => handleStatusChange('all')} />
        <StatCard label="Pending" value={getCounts().pending} colorClass="bg-gradient-to-br from-amber-400 to-orange-500" isActive={statusFilter === 'pending'} onClick={() => handleStatusChange('pending')} />
        <StatCard label="Under Review" value={getCounts().under_review} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600" isActive={statusFilter === 'under_review'} onClick={() => handleStatusChange('under_review')} />
        <StatCard label="Partial Approved" value={getCounts().partially_approved} colorClass="bg-gradient-to-br from-indigo-400 to-violet-500" isActive={statusFilter === 'partially_approved'} onClick={() => handleStatusChange('partially_approved')} />
        <StatCard label="Approved" value={getCounts().approved} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600" isActive={statusFilter === 'approved'} onClick={() => handleStatusChange('approved')} />
        <StatCard label="Rejected" value={getCounts().rejected} colorClass="bg-gradient-to-br from-red-400 to-rose-500" isActive={statusFilter === 'rejected'} onClick={() => handleStatusChange('rejected')} />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-[#C2410C] border-[#C2410C] text-white shadow-md shadow-orange-100'
                : 'bg-white border-gray-200 text-gray-700 hover:border-purple-400 hover:text-purple-700'
            }`}
          >
            <Filter size={15} />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 bg-white rounded-full opacity-80" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Applied Role</label>
                <input
                  type="text"
                  value={roleFilter}
                  onChange={handleRoleFilterChange}
                  placeholder="e.g. customer_support"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={handleDateFromChange}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={handleDateToChange}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600 font-medium transition-colors"
              >
                <X size={13} />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table / Loading / Empty */}
      {loading && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-purple-500 animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading applicationsâ€¦</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Users size={24} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-400 font-medium">No applications found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[200px]">Reference</th>
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Photo</th>
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Applicant</th>
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Phone</th>
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Roles</th>
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Submitted</th>
                  <th className="text-center py-4 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((app) => (
                  <tr key={app.id} className="hover:bg-violet-50/40 transition-colors duration-100">
                    <td className="py-4 px-5 whitespace-nowrap min-w-[200px]">
                      <span
                        className="inline-block max-w-[280px] font-mono text-[11px] text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 whitespace-nowrap overflow-hidden text-ellipsis align-middle"
                        title={vaDisplayReference(app)}
                      >
                        {vaDisplayReference(app)}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <ApplicantAvatar app={app} />
                    </td>
                    <td className="py-4 px-5 font-semibold text-gray-900 whitespace-nowrap">{app.fullName || '—'}</td>
                    <td className="py-4 px-5 text-gray-500 max-w-[180px] truncate">{app.email || '—'}</td>
                    <td className="py-4 px-5 text-gray-500 whitespace-nowrap">{app.phoneNumber || '—'}</td>
                    <td className="py-4 px-5 text-gray-500 whitespace-nowrap">{app.location || '—'}</td>
                    <td className="py-4 px-5 max-w-[200px]">
                      {app.roles ? (
                        <div className="flex flex-wrap gap-1">
                          {app.roles.split(',').slice(0, 2).map((role, i) => (
                            <span key={i} className="inline-block px-2 py-0.5 bg-violet-50 text-violet-700 rounded-lg text-[11px] font-semibold border border-violet-100">
                              {role.trim()}
                            </span>
                          ))}
                          {app.roles.split(',').length > 2 && (
                            <span className="text-[11px] text-gray-400 font-medium">
                              +{app.roles.split(',').length - 2}
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={app.overallStatus || app.status} />
                    </td>
                    <td className="py-4 px-5 text-gray-400 whitespace-nowrap text-[12px]">
                      {app.createdAt ? formatDate(app.createdAt) : '—'}
                    </td>
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/virtual-assistants/applications/${app.id}`)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-violet-700 bg-violet-50 rounded-xl hover:bg-violet-100 border border-violet-100 transition-all"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <button
                          onClick={() => { setDeleteConfirmId(app.id); setDeleteError(''); }}
                          disabled={deletingId === app.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 border border-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-t border-gray-50 gap-3">
            <p className="text-xs text-gray-400 font-medium">
              Page <span className="text-gray-700 font-bold">{page}</span> of{' '}
              <span className="text-gray-700 font-bold">{totalPages}</span> &middot;{' '}
              <span className="text-gray-700 font-bold">{total}</span> records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              {pageNumbers.map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-300 text-sm">â€¦</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[2.25rem] h-9 px-2 text-sm font-semibold rounded-xl transition-all ${
                      page === p
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Application</h3>
            <p className="text-sm text-gray-500 mb-1">
              Are you sure you want to permanently delete this DeltaOperator application?
            </p>
            <p className="text-sm text-red-500 font-medium mb-5">This action cannot be undone.</p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-4 bg-red-50 px-3 py-2 rounded-xl">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteConfirmId(null); setDeleteError(''); }}
                disabled={deletingId === deleteConfirmId}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === deleteConfirmId}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2 shadow-md shadow-red-200"
              >
                {deletingId === deleteConfirmId ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deletingâ€¦
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
    </div>
  );
}

export default VirtualAssistantApplicationsAdminPage;
