import { useState } from 'react';
import { Filter, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { paySpamexpertsAddon } from '../../utils/domainAddonCheckout';
import { readApiError } from '../../utils/apiError';

export default function SpamExpertsForm({ onClose, orders }) {
  const { user } = useAuth();
  const [domainId, setDomainId] = useState('');
  const [destinationHost, setDestinationHost] = useState('');
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
      const detail = await paySpamexpertsAddon({
        orderId: domainId,
        destinationHost: destinationHost.trim() || undefined,
        user,
        description: `SpamExperts for ${selectedOrder?.domain || 'domain'}`,
      });
      const p = detail?.spamexpertsProvisioned || {};
      setResult({
        success: true,
        message: `SpamExperts activated for ${selectedOrder?.domain || 'domain'}.`,
        mxHint: 'Point this domain’s MX records to SpamExperts (or follow the panel setup) so inbound mail is filtered. Use the login link below for the control panel.',
        loginUrl: p.loginUrl || '',
      });
    } catch (err) {
      setError(readApiError(err, 'Failed to activate SpamExperts. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-4 h-4 text-rose-600" />
          SpamExperts
        </h4>
        <button type="button" onClick={onClose} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Close
        </button>
      </div>
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
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
          Destination host (optional)
        </label>
        <input
          type="text"
          value={destinationHost}
          onChange={(e) => setDestinationHost(e.target.value)}
          disabled={isDisabled}
          placeholder={selectedOrder ? `mail.${selectedOrder.domain}` : 'mail.yourdomain.com'}
          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm disabled:opacity-50"
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 space-y-2 ${result.success ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50'}`}>
          <p>{result.message}</p>
          {result.mxHint ? <p className="font-medium text-emerald-700/90">{result.mxHint}</p> : null}
          {result.loginUrl ? (
            <a href={result.loginUrl} target="_blank" rel="noreferrer" className="underline text-rose-700">
              Open SpamExperts panel
            </a>
          ) : null}
        </div>
      )}
      <button
        type="submit"
        disabled={isDisabled || loading || !domainId || !user}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Processing...' : 'Pay & Activate SpamExperts'}
      </button>
    </form>
  );
}
