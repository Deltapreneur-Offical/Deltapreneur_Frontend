import { useCallback, useEffect, useState } from 'react';
import { Ban, RefreshCw, UserX } from 'lucide-react';
import { adminAPI } from '../../api/services';
import { readApiError } from '../../utils/apiError';
import { useCurrency } from '../../context/CurrencyContext';

export default function AdminBlacklistUsersTab({ toast } = {}) {
  const { formatPrice } = useCurrency();
  const notify = toast || { success: () => {}, error: () => {} };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return adminAPI
      .listBiddingBlocks()
      .then(({ data }) => {
        const list = data?.data ?? data ?? [];
        setRows(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        notify.error(readApiError(e, 'Failed to load blacklist.'));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const unblacklist = async (userId) => {
    setBusyId(userId);
    try {
      await adminAPI.unblacklistUser(userId);
      notify.success('User unblacklisted — they can bid again.');
      await load();
    } catch (e) {
      notify.error(readApiError(e, 'Failed to unblacklist user.'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-sm text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin" />
        Loading blacklist…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 m-0 inline-flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-600" />
            Blacklist Users
          </h2>
          <p className="text-sm text-gray-600 mt-1 mb-0">
            Users blocked after failing to pay a winning bid within 7 days. Unblacklist to restore bidding.
          </p>
        </div>
        <button type="button" className="btn-professional-sm" onClick={load}>
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <UserX className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No blacklisted users right now.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Auction</th>
                <th className="px-4 py-3">Winning bid</th>
                <th className="px-4 py-3">Blocked</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{row.displayName || row.email || row.userId}</div>
                    <div className="text-xs text-gray-500">{row.email}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">{row.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{row.title || '—'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {row.auctionType || '—'} · {row.auctionId || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {row.winningAmount != null ? formatPrice(Number(row.winningAmount)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {row.blockedAt ? new Date(row.blockedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                    {row.reason || 'Unpaid winning bid'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-professional-sm"
                      disabled={busyId === row.userId}
                      onClick={() => unblacklist(row.userId)}
                    >
                      {busyId === row.userId ? 'Working…' : 'Unblacklist'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
