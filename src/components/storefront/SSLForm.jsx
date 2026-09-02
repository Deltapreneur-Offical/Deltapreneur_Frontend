import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import useCurrency from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { domainStorefrontAPI } from '../../api/services';
import { paySslAddon } from '../../utils/domainAddonCheckout';
import { readApiError } from '../../utils/apiError';

export default function SSLForm({ onClose, orders }) {
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [domainId, setDomainId] = useState('');
  const [productId, setProductId] = useState('');
  const [period, setPeriod] = useState('1');
  const [approverEmail, setApproverEmail] = useState('');
  const [validationMethod, setValidationMethod] = useState('email');
  const [products, setProducts] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    domainStorefrontAPI.getPrices()
      .then(({ data }) => {
        const prices = data?.data ?? data;
        const list = Array.isArray(prices?.ssl?.products) ? prices.ssl.products : [];
        setProducts(list);
        if (list.length > 0) {
          const preferred = list.find((p) => !p.wildcard) || list[0];
          setProductId(String(preferred.id));
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setPricesLoading(false));
  }, []);

  const selectedOrder = orders.find((o) => String(o.id) === String(domainId));
  const provider = (selectedOrder?.provider || selectedOrder?.registrar || '').toLowerCase();
  const isOpenProvider = !selectedOrder || !provider || provider === 'openprovider' || provider === 'open provider';
  const isDisabled = !isOpenProvider || products.length === 0;

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId],
  );

  const maxPeriod = Math.max(1, Number(selectedProduct?.periodYearsMax) || 1);
  const periodOptions = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  useEffect(() => {
    if (Number(period) > maxPeriod) setPeriod(String(maxPeriod));
  }, [maxPeriod, period]);

  useEffect(() => {
    if (user?.email && !approverEmail) setApproverEmail(user.email);
  }, [user, approverEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled || !domainId || !user || !productId || !approverEmail.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      await paySslAddon({
        orderId: domainId,
        productId: Number(productId),
        period: Number(period),
        approverEmail: approverEmail.trim(),
        validationMethod,
        user,
        description: `SSL certificate for ${selectedOrder?.domain || 'domain'}`,
      });
      setResult({
        success: true,
        message: 'SSL certificate ordered. Complete domain validation if prompted; status updates on your order page.',
      });
    } catch (err) {
      setError(readApiError(err, 'Failed to purchase SSL certificate. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" />
          SSL Certificate
        </h4>
        <button type="button" onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
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
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Product</label>
        {pricesLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading live SSL products…
          </div>
        ) : products.length === 0 ? (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            SSL products are currently unavailable.
          </p>
        ) : (
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={isDisabled}
            className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all"
            required
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.wildcard ? ' (Wildcard)' : ''} — {p.label || `${formatPrice(p.unitInr)}/yr`}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Period (years)</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={isDisabled}
            className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all"
          >
            {periodOptions.map((y) => (
              <option key={y} value={y}>{y} Year{y > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Validation</label>
          <select
            value={validationMethod}
            onChange={(e) => setValidationMethod(e.target.value)}
            disabled={isDisabled}
            className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all"
          >
            <option value="email">Email</option>
            <option value="https">HTTPS</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Approver email</label>
        <input
          type="email"
          value={approverEmail}
          onChange={(e) => setApproverEmail(e.target.value)}
          disabled={isDisabled}
          placeholder="admin@yourdomain.com"
          className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#1D4ED8] outline-none transition-all disabled:opacity-50"
          required
        />
        <p className="text-[10px] text-slate-400">Use a well-known address such as admin@, hostmaster@, or webmaster@ on the domain.</p>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {result && (
        <div className={`text-xs font-semibold rounded-xl p-3 ${result.success ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50'}`}>
          {result.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isDisabled || loading || !domainId || !user || !productId || !approverEmail.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#1D4ED8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E40AF] disabled:opacity-50 shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Processing...' : (selectedProduct?.label ? `Pay & Order (${selectedProduct.label})` : 'Pay & Purchase SSL')}
      </button>
    </form>
  );
}
