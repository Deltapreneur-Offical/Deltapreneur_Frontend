import { useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchDomainTransferQuote, payDomainTransfer } from '../../utils/domainTransferCheckout';
import { readApiError } from '../../utils/apiError';

export default function TransferForm({ onClose }) {
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
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          Domain Transfer
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
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g. mycompany.com"
          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">EPP / Authorization Code</label>
        <input
          type="text"
          value={authCode}
          onChange={(e) => setAuthCode(e.target.value)}
          placeholder="Enter EPP code from current registrar"
          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
          required
        />
      </div>

      {quoteLoading && (
        <p className="text-xs text-gray-500">Loading transfer price...</p>
      )}
      {quote?.totalInr != null && !quoteLoading && (
        <p className="text-sm font-semibold text-gray-800">
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
        disabled={loading || !domain || !authCode || !user}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Processing...' : 'Pay & Transfer'}
      </button>
    </form>
  );
}
