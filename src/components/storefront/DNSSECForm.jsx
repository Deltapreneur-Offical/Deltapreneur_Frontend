import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';

export default function DNSSECForm({ onClose, onSubmit, orders }) {
  const [domainId, setDomainId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const selectedOrder = orders.find((o) => String(o.id) === String(domainId));
  const provider = (selectedOrder?.provider || selectedOrder?.registrar || '').toLowerCase();
  const isOpenProvider = !selectedOrder || !provider || provider === 'openprovider' || provider === 'open provider';
  const isDisabled = !isOpenProvider;

  const supportsDnssec = Boolean(selectedOrder?.supportsDnssec);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled || !domainId || !supportsDnssec) return;
    setLoading(true);
    setResult(null);
    try {
      await onSubmit?.({ orderId: domainId, enabled });
      setResult({ success: true, message: enabled ? 'DNSSEC enabled successfully.' : 'DNSSEC disabled successfully.' });
    } catch {
      setResult({ success: false, message: 'Failed to update DNSSEC settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-600" />
          DNSSEC Management
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Close
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Domain</label>
        <select
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
          required
        >
          <option value="">Select a registered domain</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.domain}
            </option>
          ))}
        </select>
        {domainId && !isOpenProvider && (
           <p className="text-xs text-rose-500 mt-1">This domain is not managed by OpenProvider. Services cannot be configured.</p>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 space-y-2">
        <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider">Current Status</span>
        <p className="text-xs text-gray-600 font-medium">
          {domainId ? (enabled ? 'Enabled' : 'Not Enabled') : 'Select a domain to view status'}
        </p>
        {domainId && !supportsDnssec && (
          <p className="text-[0.65rem] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            DNSSEC management is not available for this domain.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEnabled(true)}
          disabled={isDisabled || !supportsDnssec}
          className={`flex-1 h-10 text-xs font-bold rounded-xl border transition-all select-none ${
            enabled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Enable DNSSEC
        </button>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          disabled={isDisabled || !supportsDnssec}
          className={`flex-1 h-10 text-xs font-bold rounded-xl border transition-all select-none ${
            !enabled
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Disable DNSSEC
        </button>
      </div>

      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 flex items-start gap-2 ${result.success ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-rose-800 bg-rose-50 border border-rose-200'}`}>
          {result.success ? '✓' : '✗'} {result.message}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isDisabled || loading || !domainId || !supportsDnssec}
          className="inline-flex h-10 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating...
            </>
          ) : (
            enabled ? 'Enable DNSSEC' : 'Disable DNSSEC'
          )}
        </button>
      </div>
    </form>
  );
}
