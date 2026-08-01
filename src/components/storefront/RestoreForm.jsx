import { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { domainStorefrontAPI } from '../../api/services';
import {
  addonRetryUserMessage,
  getAddonRetryPayment,
  isAddonProvisionRetryError,
  payRestoreAddon,
  retryAddonProvision,
} from '../../utils/domainAddonCheckout';

export default function RestoreForm({ onClose, orders }) {
  const { user } = useAuth();
  const [domainId, setDomainId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retryPayment, setRetryPayment] = useState(null);

  const selectedOrder = orders.find((o) => String(o.id) === String(domainId));
  const provider = (selectedOrder?.provider || selectedOrder?.registrar || '').toLowerCase();
  const isOpenProvider = !selectedOrder || !provider || provider === 'openprovider' || provider === 'open provider';
  const isDisabled = !isOpenProvider;

  const applySuccess = (detail) => {
    const status = detail?.restoreProvisioned?.status || 'requested';
    setRetryPayment(null);
    setResult({
      success: true,
      message: `Restore submitted for ${selectedOrder?.domain || 'domain'} (status: ${status}).`,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled || !domainId || !user) return;
    setLoading(true);
    setResult(null);
    setError('');
    setRetryPayment(null);
    try {
      const detail = await payRestoreAddon({
        orderId: domainId,
        user,
        description: `Domain restore for ${selectedOrder?.domain || 'domain'}`,
      });
      applySuccess(detail);
    } catch (err) {
      const payment = getAddonRetryPayment(err);
      if (payment) setRetryPayment(payment);
      setError(addonRetryUserMessage(err, 'Failed to restore domain. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!domainId || !retryPayment) return;
    setLoading(true);
    setError('');
    try {
      const detail = await retryAddonProvision({
        orderId: domainId,
        payment: retryPayment,
        verifyFn: domainStorefrontAPI.verifyRestoreAddonPayment,
      });
      applySuccess(detail);
    } catch (err) {
      const payment = getAddonRetryPayment(err) || retryPayment;
      if (isAddonProvisionRetryError(err) || payment) setRetryPayment(payment);
      setError(addonRetryUserMessage(err, 'Restore retry failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[#1D4ED8]" />
          Domain Restore
        </h4>
        <button type="button" onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600">
          Close
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Restore a domain in redemption / grace period. Quote uses the live restore price plus your commission.
      </p>
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Domain</label>
        <select
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
          className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all"
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
      {retryPayment ? (
        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Retrying...' : 'Retry activation (no extra charge)'}
        </button>
      ) : null}
      <button
        type="submit"
        disabled={isDisabled || loading || !domainId || !user || !!retryPayment}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#1D4ED8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E40AF] disabled:opacity-50 shadow-sm"
      >
        {loading && !retryPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading && !retryPayment ? 'Processing...' : 'Pay & Restore Domain'}
      </button>
    </form>
  );
}
