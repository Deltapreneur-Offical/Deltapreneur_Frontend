import { useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import useCurrency from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { fetchDomainTransferQuote, payDomainTransfer } from '../../utils/domainTransferCheckout';
import { readApiError } from '../../utils/apiError';

export default function TransferForm({ onClose }) {
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [domain, setDomain] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed.includes('.')) {
      setQuote(null);
      return undefined;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setError('');
    fetchDomainTransferQuote(trimmed)
      .then((data) => {
        if (!cancelled) setQuote(data);
      })
      .catch((err) => {
        if (!cancelled) setError(readApiError(err, 'Could not load transfer price.'));
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain || !authCode || !user) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      await payDomainTransfer({
        domain: domain.trim(),
        authCode: authCode.trim(),
        user,
        description: `Transfer ${domain.trim()}`,
      });
      setResult({ success: true, message: `Domain transfer initiated successfully for ${domain}!` });
      setDomain('');
      setAuthCode('');
    } catch (err) {
      setError(readApiError(err, 'Failed to initiate domain transfer. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-[#1D4ED8]" />
          Domain Transfer
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
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g. mycompany.com"
          className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">EPP / Authorization Code</label>
        <input
          type="text"
          value={authCode}
          onChange={(e) => setAuthCode(e.target.value)}
          placeholder="Enter EPP code from current registrar"
          className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all"
          required
        />
      </div>

      {quoteLoading && (
        <p className="text-xs text-slate-500">Loading transfer price...</p>
      )}
      {quote?.totalInr != null && !quoteLoading && (
        <p className="text-sm font-semibold text-slate-800">
          Total due: {formatPrice(quote.totalInr)}
          {quote.gstInr > 0 ? ` (incl. GST ${formatPrice(quote.gstInr)})` : ''}
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
        disabled={loading || !domain || !authCode || !user}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#1D4ED8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50 shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Processing...' : 'Pay & Transfer'}
      </button>
    </form>
  );
}
