import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { payEasydmarcAddon } from '../../utils/domainAddonCheckout';
import { readApiError } from '../../utils/apiError';

export default function EasyDmarcForm({ onClose, orders }) {
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
      const detail = await payEasydmarcAddon({
        orderId: domainId,
        user,
        description: `EasyDMARC for ${selectedOrder?.domain || 'domain'}`,
      });
      const p = detail?.easydmarcProvisioned || {};
      const dnsLine = [p.recordType, p.recordHost, p.recordValue].filter(Boolean).join(' · ');
      setResult({
        success: true,
        message: dnsLine
          ? `EasyDMARC activated. DNS: ${dnsLine}`
          : 'EasyDMARC activated successfully.',
        ssoUrl: p.ssoUrl || '',
      });
    } catch (err) {
      setError(readApiError(err, 'Failed to activate EasyDMARC. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-600" />
          EasyDMARC
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
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 space-y-2 ${result.success ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50'}`}>
          <p>{result.message}</p>
          {result.ssoUrl ? (
            <a href={result.ssoUrl} target="_blank" rel="noreferrer" className="underline text-teal-700">
              Open EasyDMARC panel
            </a>
          ) : null}
        </div>
      )}
      <button
        type="submit"
        disabled={isDisabled || loading || !domainId || !user}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Processing...' : 'Pay & Activate EasyDMARC'}
      </button>
    </form>
  );
}
