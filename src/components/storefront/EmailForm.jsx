import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { domainStorefrontAPI } from '../../api/services';
import {
  addonRetryUserMessage,
  getAddonRetryPayment,
  isAddonProvisionRetryError,
  payEmailAddon,
  retryAddonProvision,
} from '../../utils/domainAddonCheckout';

export default function EmailForm({ onClose, orders }) {
  const { user } = useAuth();
  const [domainId, setDomainId] = useState('');
  const [email, setEmail] = useState('');
  const [mailboxSize, setMailboxSize] = useState('5');
  const [duration, setDuration] = useState('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retryPayment, setRetryPayment] = useState(null);

  const selectedOrder = orders.find((o) => String(o.id) === String(domainId));
  const provider = (selectedOrder?.provider || selectedOrder?.registrar || '').toLowerCase();
  const isOpenProvider = !selectedOrder || !provider || provider === 'openprovider' || provider === 'open provider';
  const isDisabled = !isOpenProvider;

  const applySuccess = (detail) => {
    const provisioned = detail?.mailboxProvisioned;
    const address = provisioned?.address || email;
    const password = provisioned?.password;
    setRetryPayment(null);
    setResult({
      success: true,
      message: password
        ? `Mailbox ${address} created. Temporary password: ${password} — change it after first login.`
        : `Mailbox ${address} configured successfully after payment.`,
      setupHint:
        'Point this domain’s MX records to your Mailcow / mail host so mail can be delivered. Save the temporary password now — it is shown only once. Use webmail or your mail client with the address above.',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled || !domainId || !email || !user) return;
    setLoading(true);
    setResult(null);
    setError('');
    setRetryPayment(null);
    try {
      const detail = await payEmailAddon({
        orderId: domainId,
        mailbox: { email, size: mailboxSize, duration },
        user,
        description: `Professional email for ${selectedOrder?.domain || 'domain'}`,
      });
      applySuccess(detail);
    } catch (err) {
      const payment = getAddonRetryPayment(err);
      if (payment) setRetryPayment(payment);
      setError(addonRetryUserMessage(err, 'Failed to configure mailbox. Please try again.'));
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
        verifyFn: domainStorefrontAPI.verifyEmailAddonPayment,
      });
      applySuccess(detail);
    } catch (err) {
      const payment = getAddonRetryPayment(err) || retryPayment;
      if (isAddonProvisionRetryError(err) || payment) setRetryPayment(payment);
      setError(addonRetryUserMessage(err, 'Activation retry failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-600" />
          Professional Email Setup
        </h4>
        <button type="button" onClick={onClose} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
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
            <option key={order.id} value={order.id}>{order.domain}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isDisabled}
          placeholder="e.g. hello@yourdomain.com"
          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all disabled:opacity-50"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Mailbox Size</label>
          <select value={mailboxSize} onChange={(e) => setMailboxSize(e.target.value)} disabled={isDisabled} className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm">
            <option value="1">1 GB</option>
            <option value="5">5 GB</option>
            <option value="10">10 GB</option>
            <option value="25">25 GB</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Duration (months)</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} disabled={isDisabled} className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm">
            <option value="1">1 Month</option>
            <option value="6">6 Months</option>
            <option value="12">1 Year</option>
            <option value="24">2 Years</option>
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 space-y-2 ${result.success ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50'}`}>
          <p>{result.message}</p>
          {result.setupHint ? <p className="font-medium text-emerald-700/90">{result.setupHint}</p> : null}
        </div>
      )}

      {retryPayment ? (
        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Retrying...' : 'Retry activation (no extra charge)'}
        </button>
      ) : null}

      <button
        type="submit"
        disabled={isDisabled || loading || !domainId || !email || !user || !!retryPayment}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading && !retryPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading && !retryPayment ? 'Processing...' : 'Pay & Create Mailbox'}
      </button>
    </form>
  );
}
