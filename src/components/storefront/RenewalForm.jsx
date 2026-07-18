import { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';

export default function RenewalForm({ onClose, onSubmit, orders }) {
  const [domainId, setDomainId] = useState('');
  const [period, setPeriod] = useState('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const selectedOrder = orders.find(o => String(o.id) === String(domainId));
  const provider = (selectedOrder?.provider || selectedOrder?.registrar || '').toLowerCase();
  const isOpenProvider = !selectedOrder || !provider || provider === 'openprovider' || provider === 'open provider';
  const isDisabled = !isOpenProvider;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled || !domainId) return;
    setLoading(true);
    setResult(null);
    try {
      await onSubmit?.({ orderId: domainId, period: Number(period) });
      setResult({ success: true, message: 'Domain renewal initiated successfully.' });
    } catch {
      setResult({ success: false, message: 'Failed to renew domain. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-indigo-600" />
          Domain Renewal
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

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Renewal Period</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          disabled={isDisabled}
          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all disabled:opacity-50"
        >
          <option value="1">1 Year</option>
          <option value="2">2 Years</option>
          <option value="5">5 Years</option>
          <option value="10">10 Years</option>
        </select>
      </div>

      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 flex items-start gap-2 ${result.success ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-rose-800 bg-rose-50 border border-rose-200'}`}>
          {result.success ? '✓' : '✗'} {result.message}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isDisabled || loading || !domainId}
          className="inline-flex h-10 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Renewing...
            </>
          ) : (
            'Renew Domain'
          )}
        </button>
      </div>
    </form>
  );
}
