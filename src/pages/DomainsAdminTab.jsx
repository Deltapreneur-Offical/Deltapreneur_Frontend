import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Trash2, AlertTriangle, X, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusFilterBar from '../components/admin/StatusFilterBar';
import { DOMAIN_STATUS_CONFIG, DOMAIN_STATUSES, resolveDomainStatus } from '../utils/domainStatuses';
import { adminAPI } from '../api/services';

const toast = {
  success: (msg) => alert(msg),
  error: (msg) => alert(msg),
};

function CustomCheckbox({ checked, indeterminate, onChange, label, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={`inline-flex items-center justify-center w-5 h-5 rounded-md border transition-all duration-150 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        checked || indeterminate
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
          : 'bg-white border-gray-300 hover:border-indigo-500 text-transparent shadow-xs'
      } ${className}`}
    >
      {checked && !indeterminate && (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {indeterminate && (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      )}
    </button>
  );
}

const ITEMS_PER_PAGE = 20;

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function PermanentDeleteConfirmModal({ count, onConfirm, onCancel, loading }) {
  return (
    <div
      className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-delete-modal-title"
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </span>
          <div>
            <h3 id="perm-delete-modal-title" className="text-base font-bold text-gray-900 leading-snug">
              Delete Domain{count > 1 ? 's' : ''} Permanently?
            </h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              This action is irreversible. The selected domain{count > 1 ? 's' : ''} ({count}) will be permanently deleted from the system and cannot be recovered.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-3 mt-2">
          <button
            type="button"
            className="w-full sm:flex-1 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="w-full sm:flex-1 rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DomainsAdminTab = ({ data, renderItem, onRefresh }) => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState(DOMAIN_STATUSES.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Selection state (only relevant for Taken Down tab)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Confirm modal state
  const [confirmTarget, setConfirmTarget] = useState(null); // { ids: string[] }
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Derive counts and filter data
  const { filteredData, counts } = useMemo(() => {
    const newCounts = {
      [DOMAIN_STATUSES.ALL]: data.length,
      [DOMAIN_STATUSES.PENDING]: 0,
      [DOMAIN_STATUSES.VERIFIED]: 0,
      [DOMAIN_STATUSES.APPROVED]: 0,
      [DOMAIN_STATUSES.TAKEN_DOWN]: 0,
    };

    const query = searchQuery.trim().toLowerCase();

    // Sort logic (Pending -> Verified -> Approved -> Taken Down, newest first)
    const statusPriority = {
      [DOMAIN_STATUSES.PENDING]: 1,
      [DOMAIN_STATUSES.VERIFIED]: 2,
      [DOMAIN_STATUSES.APPROVED]: 3,
      [DOMAIN_STATUSES.TAKEN_DOWN]: 4,
    };

    const sortedData = [...data].sort((a, b) => {
      const statusA = resolveDomainStatus(a);
      const statusB = resolveDomainStatus(b);

      if (statusPriority[statusA] !== statusPriority[statusB]) {
        return statusPriority[statusA] - statusPriority[statusB];
      }

      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    const result = sortedData.filter((item) => {
      const status = resolveDomainStatus(item);
      newCounts[status]++;

      // Filter by active status tab
      if (activeFilter !== DOMAIN_STATUSES.ALL && status !== activeFilter) {
        return false;
      }

      // Filter by search query
      if (query) {
        const domainName = (item.domainName || '').toLowerCase();
        const extension = (item.domainExtension || '').toLowerCase();
        const fullDomain = domainName + extension;
        const ownerName = ((item.listedBy?.firstname || '') + ' ' + (item.listedBy?.lastname || '')).toLowerCase();
        const ownerEmail = (item.listedBy?.email || '').toLowerCase();
        const idStr = String(item.id || '');

        if (!fullDomain.includes(query) && !ownerName.includes(query) && !ownerEmail.includes(query) && !idStr.includes(query)) {
          return false;
        }
      }

      return true;
    });

    return { filteredData: result, counts: newCounts };
  }, [data, activeFilter, searchQuery]);

  // Reset pagination + selection when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeFilter, searchQuery]);

  // Clear selection when switching away from Taken Down tab
  useEffect(() => {
    if (activeFilter !== DOMAIN_STATUSES.TAKEN_DOWN) {
      setSelectedIds(new Set());
    }
  }, [activeFilter]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Derived selection helpers
  const isTakenDownTab = activeFilter === DOMAIN_STATUSES.TAKEN_DOWN;
  const takenDownOnPage = isTakenDownTab ? paginatedData : [];
  const takenDownIdsOnPage = takenDownOnPage.map((item) => String(item.id));
  const allOnPageSelected =
    takenDownIdsOnPage.length > 0 && takenDownIdsOnPage.every((id) => selectedIds.has(id));
  const someOnPageSelected = takenDownIdsOnPage.some((id) => selectedIds.has(id));

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (allOnPageSelected) {
      // Deselect all on page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        takenDownIdsOnPage.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all on page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        takenDownIdsOnPage.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allOnPageSelected, takenDownIdsOnPage]);

  // Open confirm modal for individual or bulk delete
  const openConfirmDelete = useCallback((ids) => {
    setConfirmTarget({ ids });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmTarget?.ids?.length) return;
    setDeleteLoading(true);
    try {
      await adminAPI.permanentDeleteDomains(confirmTarget.ids);
      toast.success(
        confirmTarget.ids.length === 1
          ? 'Domain permanently deleted.'
          : `${confirmTarget.ids.length} domains permanently deleted.`
      );
      setSelectedIds(new Set());
      setConfirmTarget(null);
      onRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to permanently delete domain(s).');
    } finally {
      setDeleteLoading(false);
    }
  }, [confirmTarget, onRefresh]);

  const [restoreLoading, setRestoreLoading] = useState(false);

  const handleBulkRestore = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setRestoreLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => adminAPI.restore('DOMAIN', id)));
      toast.success(`Successfully restored ${ids.length} domain(s).`);
      setSelectedIds(new Set());
      onRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to restore selected domain(s).');
    } finally {
      setRestoreLoading(false);
    }
  }, [selectedIds, onRefresh]);

  return (
    <div className="domains-admin-tab">
      {/* ── Filter Bar + Search ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <StatusFilterBar
          config={DOMAIN_STATUS_CONFIG}
          activeStatus={activeFilter}
          counts={counts}
          onFilterChange={setActiveFilter}
        />

        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            placeholder={t('adminSearchDomainsPlaceholder', { defaultValue: 'Search domains by name, ID, or owner...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <h3 className="font-display text-xl font-bold text-gray-700">
            {activeFilter === DOMAIN_STATUSES.ALL
              ? t('adminNoDomainsFound', { defaultValue: 'No domains found.' })
              : `No ${DOMAIN_STATUS_CONFIG.find(c => c.id === activeFilter)?.label.toLowerCase()} domains`}
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery
              ? 'Try adjusting your search query to find what you are looking for.'
              : 'All domains in this category have been processed.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">

          {/* ── Select All Row (Taken Down tab only) ──────────────────────── */}
          {isTakenDownTab && takenDownIdsOnPage.length > 0 && (
            <div
              onClick={handleSelectAll}
              className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-xs cursor-pointer select-none hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CustomCheckbox
                  checked={allOnPageSelected}
                  indeterminate={someOnPageSelected && !allOnPageSelected}
                  onChange={handleSelectAll}
                  label="Select All on Page"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Select All on Page ({takenDownIdsOnPage.length})
                </span>
              </div>
              {selectedIds.size > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
          )}

          {/* ── Bulk Action Bar (shown when ≥1 selected) ───────────────────── */}
          {isTakenDownTab && selectedIds.size > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-indigo-50/80 border border-indigo-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  {selectedIds.size}
                </span>
                <span className="text-sm font-semibold text-gray-800">
                  {selectedIds.size} domain{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2 px-1"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={restoreLoading || deleteLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-xs disabled:opacity-50"
                  onClick={handleBulkRestore}
                >
                  <RotateCcw size={13} className="text-indigo-600" />
                  Restore ({selectedIds.size})
                </button>
                <button
                  type="button"
                  disabled={restoreLoading || deleteLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 border border-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all shadow-xs disabled:opacity-60"
                  onClick={() => openConfirmDelete(Array.from(selectedIds))}
                >
                  <Trash2 size={13} />
                  Delete Permanently ({selectedIds.size})
                </button>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500 mb-1">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length} records
          </div>

          {/* ── Items ─────────────────────────────────────────────────────── */}
          {paginatedData.map((item) => {
            const isTakenDown = isTakenDownTab;
            const itemId = String(item.id);
            const isSelected = selectedIds.has(itemId);

            return (
              <div key={item.id} className="flex items-center gap-3">
                {isTakenDown && (
                  <div className="flex-shrink-0 pl-1">
                    <CustomCheckbox
                      checked={isSelected}
                      onChange={() => handleToggleSelect(itemId)}
                      label={`Select domain ${item.domainName || itemId}`}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {renderItem(item, {
                    onDeletePermanently: isTakenDownTab ? () => openConfirmDelete([itemId]) : undefined,
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Pagination ────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────────────── */}
      {confirmTarget && (
        <PermanentDeleteConfirmModal
          count={confirmTarget.ids.length}
          loading={deleteLoading}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleteLoading && setConfirmTarget(null)}
        />
      )}
    </div>
  );
};

export default DomainsAdminTab;
