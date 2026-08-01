import { useEffect, useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchDomainRenewalQuote, payDomainRenewal } from '../../utils/domainRenewalCheckout';
import { readApiError } from '../../utils/apiError';

export default function RenewalForm({ onClose, orders }) {
  const { user } = useAuth();
  const [domainId, setDomainId] = useState('');
  const [period, setPeriod] = useState('1');
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const selectedOrder = orders.find((o) => String(o.id) === String(domainId));
  const provider = (selectedOrder?.provider || selectedOrder?.registrar || '').toLowerCase();
  const isOpenProvider = !selectedOrder || !provider || provider === 'openprovider' || provider === 'open provider';
  const isDisabled = !isOpenProvider;

  useEffect(() => {
    if (!domainId || isDisabled) {
      setQuote(null);
      return undefined;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setError('');
    fetchDomainRenewalQuote(domainId, Number(period))
      .then((data) => {
        if (!cancelled) setQuote(data);
      })
      .catch((err) => {
        if (!cancelled) setError(readApiError(err, 'Could not load renewal price.'));
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domainId, period, isDisabled]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled || !domainId || !user) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      await payDomainRenewal({
        orderId: domainId,
        period: Number(period),
        user,
        description: `Renew ${selectedOrder?.domain || 'domain'} for ${period} year(s)`,
      });
      setResult({ success: true, message: 'Domain renewal completed successfully.' });
    } catch (err) {
      setError(readApiError(err, 'Failed to renew domain. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[#1D4ED8]" />
          Domain Renewal
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
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
            <option key={order.id} value={order.id}>
              {order.domain}
            </option>
          ))}
        </select>
        {domainId && !isOpenProvider && (
           <p className="text-xs text-rose-500 mt-1">This domain is not eligible for CoBrother managed services yet.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Renewal Period</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          disabled={isDisabled}
          className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all disabled:opacity-50"
        >
          <option value="1">1 Year</option>
          <option value="2">2 Years</option>
          <option value="5">5 Years</option>
          <option value="10">10 Years</option>
        </select>
      </div>

      {quoteLoading && (
        <p className="text-xs text-slate-500">Loading renewal price...</p>
      )}
      {quote?.totalInr != null && !quoteLoading && (
        <p className="text-sm font-semibold text-slate-800">
          Total due: ₹{Number(quote.totalInr).toLocaleString('en-IN')}
          {quote.gstInr > 0 ? ` (incl. GST ₹${Number(quote.gstInr).toLocaleString('en-IN')})` : ''}
        </p>
      )}

      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}

      {result && (
        <p className={`text-xs ${result.success ? 'text-emerald-600' : 'text-rose-600'}`}>
          {result.message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || isDisabled || !domainId || !user}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#1D4ED8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50 shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Processing...' : 'Pay & Renew'}
      </button>
    </form>
  );
}
