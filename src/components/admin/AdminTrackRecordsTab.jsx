import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  RefreshCw,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  User,
  PackageCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { adminAPI } from '../../api/services';
import { formatInr } from '../../utils/money';

const CATEGORIES = [
  'All Categories',
  'Domain Registration (OpenProvider)',
  'Domain Registration (Reseller)',
  'Domain Marketplace',
  'Technology Purchase',
  'Venture / Deal Payment',
  'Domain Addon (Email)',
  'Domain Addon (SSL)',
  'Domain Renewal',
  'Domain Transfer',
  'OpenProvider Managed Acquisition',
  'Other',
];

const OVERALL_STATUSES = [
  'All Statuses',
  'Success',
  'Failed',
  'Pending',
  'Partial',
  'Refunded',
];

export default function AdminTrackRecordsTab() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Detail Record Drawer
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchTrackRecords = useCallback(async () => {
    setLoading(true);
    try {
      try {
        await adminAPI.syncTrackRecords();
      } catch (syncErr) {
        console.warn('Track Records sync skipped:', syncErr);
      }

      const params = {
        page,
        limit,
        search: searchTerm.trim() || undefined,
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        overallStatus: selectedStatus !== 'All Statuses' ? selectedStatus : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        sortBy: 'timestamp',
        sortDir: 'desc',
      };

      const res = await adminAPI.getTrackRecords(params);
      const data = res.data;
      if (data && data.success) {
        setRecords(data.items || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setRecords([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch Track Records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedCategory, selectedStatus, startDate, endDate]);

  useEffect(() => {
    fetchTrackRecords();
  }, [fetchTrackRecords]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All Categories');
    setSelectedStatus('All Statuses');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const openRecordDetails = (rec) => {
    setSelectedRecord(rec);
    setDrawerOpen(true);
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-600" />
          Success
        </span>
      );
    }
    if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={13} className="text-rose-600" />
          Failed
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={13} className="text-amber-600" />
          Pending
        </span>
      );
    }
    if (s === 'PARTIAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <AlertTriangle size={13} className="text-purple-600" />
          Partial
        </span>
      );
    }
    if (s === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          Refunded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
        {status}
      </span>
    );
  };

  // Calculate quick metrics from current slice
  const successCount = records.filter((r) => (r.overallStatus || '').toUpperCase() === 'SUCCESS').length;
  const failedCount = records.filter((r) => (r.overallStatus || '').toUpperCase() === 'FAILED').length;
  const totalVolume = records.reduce((sum, r) => sum + (Number(r.amountCharged) || 0), 0);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-widest mb-1">
            <ClipboardList size={15} /> Single Source of Truth
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white">
            Track Records Audit Trail
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Centralized tracking of every paid transaction attempt across domain registrations, marketplace purchases, technology orders, and venture deal payments.
          </p>
        </div>
        <button
          onClick={fetchTrackRecords}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-xs backdrop-blur transition-all border border-white/15 active:scale-95 shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Records</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Provisioned Page Batch</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">{successCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <XCircle size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attention Required</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-0.5">{failedCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Page Volume (INR)</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{formatInr(totalVolume)}</div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Multi-field Search */}
          <div className="lg:col-span-2 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Buyer Name, Email, Phone, Domain, Payment ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              {OVERALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearFilters}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <X size={14} /> Clear Filters
            </button>
          </div>
        </div>

        {/* Date Range Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
            <Calendar size={12} /> Date Range:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Track Records Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mb-3" />
            <p className="text-xs font-semibold">Loading Track Records audit data...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <ClipboardList size={36} className="text-slate-300 mb-3" />
            <h4 className="text-base font-bold text-slate-800">No Track Records Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No transactions match your current search or filter criteria. Try clearing active filters.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Internal Order ID</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Item & Qty</th>
                  <th className="py-3.5 px-4">Buyer</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Overall Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      <div>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</div>
                      <div className="text-[10px] text-slate-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {r.internalOrderId}
                      {r.cartBatchId && (
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          Batch: {r.cartBatchId}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate" title={r.itemName}>
                      <div className="font-bold text-slate-900 truncate">{r.itemName}</div>
                      <div className="text-[10px] text-slate-400">Qty/Years: {r.quantityYears}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{r.buyerName || 'Buyer'}</div>
                      <div className="text-[10px] text-slate-400">{r.buyerEmail || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                      {r.buyerPhone || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {formatInr(r.amountCharged)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          r.paymentStatus === 'CAPTURED' || r.paymentStatus === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.paymentStatus === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {r.paymentStatus === 'CAPTURED' ? 'SUCCESS' : r.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{renderStatusBadge(r.overallStatus)}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openRecordDetails(r)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1"
                      >
                        Details <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && records.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
            <div>
              Showing page <span className="font-bold text-slate-900">{page}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span> ({totalCount} total records)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Drawer / Modal */}
      {drawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col justify-between">
            {/* Drawer Header */}
            <div>
              <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                    <ClipboardList size={14} /> Track Record Inspection
                  </div>
                  <h3 className="text-xl font-bold font-display mt-1 text-white">
                    {selectedRecord.internalOrderId}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1">
                    Created: {selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleString() : '-'}
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">Overall Transaction Status</div>
                <div>{renderStatusBadge(selectedRecord.overallStatus)}</div>
              </div>

              {/* Drawer Content Body */}
              <div className="p-6 space-y-6 text-xs text-slate-700">
                {/* Error Diagnostics Section if Failed */}
                {selectedRecord.overallStatus === 'Failed' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <ShieldAlert size={16} /> Provisioning / Fulfillment Error Diagnostics
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                      <div>
                        <span className="text-slate-500 font-normal">Error Source:</span>{' '}
                        <span className="font-bold text-rose-700">{selectedRecord.errorSource || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-normal">Error Code:</span>{' '}
                        <span className="font-bold text-rose-700">{selectedRecord.errorCode || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <span className="text-slate-500 font-normal">Error Message:</span>
                      <pre className="mt-1 p-2.5 bg-white border border-rose-100 rounded-xl text-rose-800 text-[11px] font-mono whitespace-pre-wrap break-all">
                        {selectedRecord.errorMessage || 'No detailed error message captured.'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Buyer Information Section */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" /> Buyer Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500">Name:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.buyerName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Email:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.buyerEmail || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Phone:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.buyerPhone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">User ID:</span>{' '}
                      <span className="font-mono text-[11px] text-slate-800">{selectedRecord.buyerUserId || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Purchase Details Section */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                    <PackageCheck size={14} className="text-indigo-600" /> Purchase Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="col-span-2">
                      <span className="text-slate-500">Item Name:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.itemName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Category:</span>{' '}
                      <span className="font-semibold text-indigo-700">{selectedRecord.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Sub-Category:</span>{' '}
                      <span className="font-medium text-slate-800">{selectedRecord.providerSubcategory || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Quantity / Years:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.quantityYears}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Item ID:</span>{' '}
                      <span className="font-mono text-[11px] text-slate-800">{selectedRecord.itemId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Amount Charged:</span>{' '}
                      <span className="font-bold text-emerald-700 text-sm">{formatInr(selectedRecord.amountCharged)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Currency:</span>{' '}
                      <span className="font-semibold text-slate-800">{selectedRecord.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Information Section */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-indigo-600" /> Payment Gateway Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500">Razorpay Order ID:</span>{' '}
                      <span className="font-mono text-[11px] font-bold text-slate-900">{selectedRecord.razorpayOrderId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Razorpay Payment ID:</span>{' '}
                      <span className="font-mono text-[11px] font-bold text-slate-900">{selectedRecord.razorpayPaymentId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Razorpay Refund ID:</span>{' '}
                      <span className="font-mono text-[11px] text-slate-800">{selectedRecord.razorpayRefundId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Payment Status:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.paymentStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Fulfillment / Registrar Section */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" /> Registrar & Provisioning Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500">Fulfillment Status:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.fulfillmentStatus}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Provision Attempts:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.provisionAttempts}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">OpenProvider Domain ID:</span>{' '}
                      <span className="font-mono text-[11px] font-bold text-slate-900">
                        {selectedRecord.openproviderDomainId || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 text-xs">Read-Only Audit Record</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
