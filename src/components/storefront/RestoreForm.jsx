import { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { payRestoreAddon } from '../../utils/domainAddonCheckout';
import { readApiError } from '../../utils/apiError';

export default function RestoreForm({ onClose, orders }) {
  const { user } = useAuth();
  const [domainId, setDomainId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const selectedOrder = orders.find((o) => String(o.id) === String(domainId));
  const provider = (selectedOrder?.provider || selectedOrder?.registrar || '').toLowerCase();
  const isOpenProvider = !selectedOrder || !provider || provider === 'openprovider' || provider === 'open provider';
  const isDisabled = !isOpenProvider;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled || !domainId || !user) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const detail = await payRestoreAddon({
        orderId: domainId,
        user,
        description: `Domain restore for ${selectedOrder?.domain || 'domain'}`,
      });
      const status = detail?.restoreProvisioned?.status || 'requested';
      setResult({
        success: true,
        message: `Restore submitted for ${selectedOrder?.domain || 'domain'} (status: ${status}).`,
      });
    } catch (err) {
      setError(readApiError(err, 'Failed to restore domain. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-600" />
          Domain Restore
        </h4>
        <button type="button" onClick={onClose} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Close
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Restore a domain in redemption / grace period via OpenProvider. Quote uses the live restore price plus your commission.
      </p>
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Domain</label>
        <select
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm"
          required
        >
          <option value="">Select a registered domain</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>{order.domain}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 ${result.success ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50'}`}>
          {result.message}
        </div>
      )}
      <button
        type="submit"
        disabled={isDisabled || loading || !domainId || !user}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Processing...' : 'Pay & Restore Domain'}
      </button>
    </form>
  );
}
