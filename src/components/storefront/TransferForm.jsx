import { useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';

export default function TransferForm({ onClose, onSubmit }) {
  const [domain, setDomain] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain || !authCode) return;
    setLoading(true);
    setResult(null);
    try {
      await onSubmit?.({ domain, authCode });
      setResult({ success: true, message: `Domain transfer initiated successfully for ${domain}!` });
      setDomain('');
      setAuthCode('');
    } catch {
      setResult({ success: false, message: 'Failed to initiate domain transfer. Please try again.' });
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
          placeholder="Enter the auth code from your current registrar"
          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
          required
        />
      </div>

      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 flex items-start gap-2 ${result.success ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-rose-800 bg-rose-50 border border-rose-200'}`}>
          {result.success ? '✓' : '✗'} {result.message}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading || !domain || !authCode}
          className="inline-flex h-10 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Transferring...
            </>
          ) : (
            <>
              Transfer Domain <ArrowRightLeft className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
