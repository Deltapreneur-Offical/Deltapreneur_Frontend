import { useMemo, useState } from 'react';
import { openProviderManagedAcquisitionAPI } from '../../api/services';
import useCurrency from '../../context/CurrencyContext';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'DECLINED', label: 'Declined' },
];

const TIER_FILTERS = [
  { id: 'all', label: 'All tiers' },
  { id: 'standard', label: 'Standard Domains' },
  { id: 'premium', label: 'Premium Domains' },
];

const STATUS_ACTIONS = {
  IN_PROGRESS: { title: 'Move to In Progress', newStatus: 'IN_PROGRESS' },
  ACCEPTED: { title: 'Accept Request', newStatus: 'ACCEPTED' },
  COMPLETED: { title: 'Mark Completed', newStatus: 'COMPLETED' },
  DECLINED: { title: 'Decline Request', newStatus: 'DECLINED' },
  PENDING: { title: 'Reopen Request', newStatus: 'PENDING' },
};

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const colors = {
    PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
    IN_PROGRESS: 'bg-sky-50 text-sky-800 ring-sky-200',
    ACCEPTED: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    COMPLETED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    DECLINED: 'bg-rose-50 text-rose-800 ring-rose-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${colors[s] || 'bg-gray-50 text-gray-700 ring-gray-200'}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}

function cardActions(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'PENDING') return ['IN_PROGRESS', 'ACCEPTED', 'DECLINED'];
  if (s === 'IN_PROGRESS') return ['ACCEPTED', 'DECLINED'];
  if (s === 'ACCEPTED') return ['COMPLETED', 'DECLINED'];
  if (s === 'DECLINED') return ['PENDING'];
  return [];
}

export default function OpenProviderManagedAcquisitionsTable({ rows, onRefresh }) {
  const { formatPrice } = useCurrency();
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    return (rows || []).filter((item) => {
      const statusOk =
        statusFilter === 'all'
        || String(item?.status || '').toUpperCase() === statusFilter;
      const isPremium = Boolean(item?.isRegistryPremium || item?.registryTier === 'premium');
      const tierOk =
        tierFilter === 'all'
        || (tierFilter === 'premium' ? isPremium : !isPremium);
      return statusOk && tierOk;
    });
  }, [rows, statusFilter, tierFilter]);

  const confirm = async () => {
    if (!modal) return;
    setLoading(true);
    setError('');
    try {
      if (modal.action === 'remove') {
        await openProviderManagedAcquisitionAPI.remove(modal.id, {
          adminNotes: modal.adminNotes,
        });
      } else {
        await openProviderManagedAcquisitionAPI.updateStatus(modal.id, {
          status: modal.newStatus,
          adminNotes: modal.adminNotes,
        });
      }
      setModal(null);
      onRefresh?.();
    } catch (err) {
      setError(
        err.response?.data?.error
        || err.response?.data?.message
        || err.message
        || 'Update failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!rows?.length) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
          No OpenProvider acquisition requests yet
        </h3>
        <p className="text-gray-600">
          Registry domains with GST-inclusive payable above ₹5,00,000 appear here after buyers confirm.
        </p>
      </div>
    );
  }

  return (
    <>
      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 mb-3">
        {TIER_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTierFilter(tab.id)}
            className={tierFilter === tab.id ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            style={{ fontSize: '0.78rem' }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((tab) => {
          const count = tab.id === 'all'
            ? rows.length
            : rows.filter((item) => String(item?.status || '').toUpperCase() === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={statusFilter === tab.id ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              style={{ fontSize: '0.78rem' }}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600">No requests match this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((row) => {
            const status = String(row.status || '').toUpperCase();
            const actions = cardActions(status);
            return (
              <div key={row.id} className="admin-record-card" style={{ padding: '1rem 1.25rem' }}>
                <div className="flex justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <div className="admin-record-title">{row.domainName}</div>
                    <div className="admin-record-id">
                      Snapshot payable: {formatPrice(row.payableInr || row.requestedPrice || 0)}
                      {row.periodYears ? ` · ${row.periodYears} yr` : ''}
                      {row.isRegistryPremium ? ' · Premium registry' : ' · Standard registry'}
                    </div>
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="admin-field-label">Buyer</div>
                    <div className="admin-field-value">{row.fullName}</div>
                    <div className="admin-field-meta">{row.email}</div>
                    <div className="admin-field-meta">{row.phone}</div>
                  </div>
                  <div>
                    <div className="admin-field-label">Message</div>
                    <div className="admin-field-value text-sm">{row.message || '—'}</div>
                    {row.adminNotes ? (
                      <div className="admin-field-meta mt-1">Notes: {row.adminNotes}</div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {actions.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setModal({
                        id: row.id,
                        action: 'status',
                        newStatus: key,
                        adminNotes: row.adminNotes || '',
                      })}
                    >
                      {STATUS_ACTIONS[key]?.title || key}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary btn-sm text-rose-700"
                    onClick={() => setModal({
                      id: row.id,
                      action: 'remove',
                      adminNotes: row.adminNotes || '',
                    })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-xl font-bold text-gray-900 mb-2">
              {modal.action === 'remove'
                ? 'Remove Request'
                : (STATUS_ACTIONS[modal.newStatus]?.title || 'Update status')}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Message to buyer (email + in-app notification):
            </p>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm min-h-[100px]"
              value={modal.adminNotes}
              onChange={(e) => setModal((m) => ({ ...m, adminNotes: e.target.value }))}
              disabled={loading}
              placeholder="Optional update for the buyer..."
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={loading}
                onClick={() => !loading && setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={loading}
                onClick={confirm}
              >
                {loading ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
