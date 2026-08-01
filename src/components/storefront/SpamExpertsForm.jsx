import { useState } from 'react';
import { Filter, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { domainStorefrontAPI } from '../../api/services';
import {
  addonRetryUserMessage,
  getAddonRetryPayment,
  isAddonProvisionRetryError,
  paySpamexpertsAddon,
  retryAddonProvision,
} from '../../utils/domainAddonCheckout';

export default function SpamExpertsForm({ onClose, orders }) {
  const { user } = useAuth();
  const [domainId, setDomainId] = useState('');
  const [destinationHost, setDestinationHost] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retryPayment, setRetryPayment] = useState(null);

  const selectedOrder = orders.find((o) => String(o.id) === String(domainId));
  const provider = (selectedOrder?.provider || selectedOrder?.registrar || '').toLowerCase();
  const isOpenProvider = !selectedOrder || !provider || provider === 'openprovider' || provider === 'open provider';
  const isDisabled = !isOpenProvider;

  const applySuccess = (detail) => {
    const p = detail?.spamexpertsProvisioned || {};
    const mxRecords = Array.isArray(p.mxRecords) && p.mxRecords.length
      ? p.mxRecords
      : [
          { host: 'mx.spamexperts.com', priority: 100 },
          { host: 'fallbackmx.spamexperts.eu', priority: 200 },
          { host: 'lastmx.spamexperts.net', priority: 300 },
        ];
    setRetryPayment(null);
    setResult({
      success: true,
      message: `SpamExperts activated for ${selectedOrder?.domain || 'domain'}.`,
      destinationHost: p.destinationHost || destinationHost.trim() || '',
      mxRecords,
      mxHint:
        'Replace existing MX records with the SpamExperts hosts below (do not keep old MX alongside them). Filtered mail is delivered to your destination host.',
      loginUrl: p.loginUrl || '',
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
      const detail = await paySpamexpertsAddon({
        orderId: domainId,
        destinationHost: destinationHost.trim() || undefined,
        user,
        description: `SpamExperts for ${selectedOrder?.domain || 'domain'}`,
      });
      applySuccess(detail);
    } catch (err) {
      const payment = getAddonRetryPayment(err);
      if (payment) setRetryPayment(payment);
      setError(addonRetryUserMessage(err, 'Failed to activate SpamExperts. Please try again.'));
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
        verifyFn: domainStorefrontAPI.verifySpamexpertsAddonPayment,
      });
      applySuccess(detail);
    } catch (err) {
      const payment = getAddonRetryPayment(err) || retryPayment;
      if (isAddonProvisionRetryError(err) || payment) setRetryPayment(payment);
      setError(addonRetryUserMessage(err, 'SpamExperts retry failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#1D4ED8]" />
          SpamExperts
        </h4>
        <button type="button" onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600">
          Close
        </button>
      </div>
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
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
          Destination host (optional)
        </label>
        <input
          type="text"
          value={destinationHost}
          onChange={(e) => setDestinationHost(e.target.value)}
          disabled={isDisabled}
          placeholder={selectedOrder ? `mail.${selectedOrder.domain}` : 'mail.yourdomain.com'}
          className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all disabled:opacity-50"
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 space-y-2 ${result.success ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50'}`}>
          <p>{result.message}</p>
          {result.destinationHost ? (
            <p className="font-medium text-emerald-900/90">Destination (delivery): {result.destinationHost}</p>
          ) : null}
          {result.mxHint ? <p className="font-medium text-emerald-700/90">{result.mxHint}</p> : null}
          {Array.isArray(result.mxRecords) && result.mxRecords.length > 0 ? (
            <ul className="list-disc pl-4 space-y-1 font-medium text-emerald-900/90">
              {result.mxRecords.map((row) => (
                <li key={`${row.host}-${row.priority}`}>
                  MX {row.host} (priority {row.priority})
                </li>
              ))}
            </ul>
          ) : null}
          {result.loginUrl ? (
            <a href={result.loginUrl} target="_blank" rel="noreferrer" className="underline text-[#1D4ED8]">
              Open SpamExperts panel
            </a>
          ) : null}
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
        {loading && !retryPayment ? 'Processing...' : 'Pay & Activate SpamExperts'}
      </button>
    </form>
  );
}
