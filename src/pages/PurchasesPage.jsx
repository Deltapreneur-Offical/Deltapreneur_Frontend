import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { domainAPI, technologyAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import PurchaseIcon from '../assets/purchase.png';
import DomainsIcon from '../assets/CoBranding.png';
import SoftwareIcon from '../assets/CoCreation.png';
import CoBrotherIcon from '../assets/Community-profileicon.png';
import { generateInvoice } from '../utils/generateInvoice';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { buildOrderCurrencyPayload } from '../utils/currencyDisplay';
import { asArray } from '../utils/asArray';
import { extractDomainList } from '../utils/domainApiAdapter';

export default function PurchasesPage() {
  const { formatPrice } = useCurrency();
  const navigate                      = useNavigate();
  const [tab, setTab]                 = useState('all');
  const [domains, setDomains]         = useState([]);
  const [swPurchases, setSwPurchases] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [helpModal, setHelpModal]     = useState(null);
  const [helpSuccess, setHelpSuccess] = useState(null);

  // Optional: pull user info from your auth context/store for the invoice billing section
  // const { user } = useAuth();
  const user = {}; // Replace with real user: { name, email, gstin, address }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      domainAPI.getMyPurchases().catch(() => ({ data: [] })),
      technologyAPI.getMyPurchases().catch(() => ({ data: [] })),
    ]).then(([d, s]) => {
      setDomains(extractDomainList(d.data));
      setSwPurchases(asArray(s.data));
    }).finally(() => setLoading(false));
  }, []);

  const completedDomains  = asArray(domains).filter(d =>
    d.paymentStatus === 'COMPLETED' ||
    d.domainStatus === 'SOLD' ||
    d.purchasedByUserId ||
    d.purchased_by_user_id
  );
  const completedSoftware = asArray(swPurchases).filter(p => p.paymentStatus === 'COMPLETED');
  const totalItems        = completedDomains.length + completedSoftware.length;

  const displayItems =
    tab === 'domains'  ? completedDomains.map(d => ({ ...d, _type: 'domain' }))
  : tab === 'software' ? completedSoftware.map(p => ({ ...p, _type: 'software' }))
  : [
      ...completedDomains.map(d => ({ ...d, _type: 'domain' })),
      ...completedSoftware.map(p => ({ ...p, _type: 'software' })),
    ];

  return (
    <AppLayout>
      <div>
        <div className="mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">My Purchases</h1>
            <p className="text-gray-600 mt-1">All your domain and software purchases in one place.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Purchases"  value={totalItems}                  iconSrc={PurchaseIcon} />
          <StatCard label="Domains"          value={completedDomains.length}     iconSrc={DomainsIcon} color="#6eadc8" />
          <StatCard label="Software"         value={completedSoftware.length}    iconSrc={SoftwareIcon} color="#a06ec8" />
          <StatCard label="CoBrother Active"
            value={completedSoftware.filter(p => p.coBrotherHelpPaid).length}
            iconSrc={CoBrotherIcon} color="#6ec896" />
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { id: 'all',      label: `All (${totalItems})` },
            { id: 'domains',  label: `Domains (${completedDomains.length})` },
            { id: 'software', label: `Software (${completedSoftware.length})` },
          ].map(t => (
            <button key={t.id}
              className={`btn-glow btn-glow-sm ${tab === t.id ? 'bg-gray-900 text-white border-gray-900' : ''}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No purchases yet</h3>
            <p className="text-gray-600 mb-6">Browse domains and software to make your first purchase.</p>
            <div className="flex gap-3 justify-center">
              <button className="btn-glow btn-glow-sm" onClick={() => navigate('/domains')}>Browse Domains</button>
              <button className="btn-glow btn-glow-sm" onClick={() => navigate('/technology')}>Browse Technology</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {displayItems.map((item) =>
              item._type === 'domain' ? (
                <DomainPurchaseRow
                  key={'d-' + item.id}
                  domain={item}
                />
              ) : (
                <SoftwarePurchaseRow
                  key={'s-' + item.id}
                  purchase={item}
                  onGetHelp={() => setHelpModal(item)}
                  onDownloadInvoice={() => generateInvoice({ type: 'software', item, user })}
                />
              )
            )}
          </div>
        )}
      </div>

      {helpModal && (
        <CoBrotherHelpModal
          purchase={helpModal}
          onClose={() => setHelpModal(null)}
          onSuccess={(updated) => {
            setSwPurchases(prev => prev.map(p => p.id === updated.id ? updated : p));
            setHelpModal(null);
            setHelpSuccess(updated);
          }}
        />
      )}

      {helpSuccess && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setHelpSuccess(null)}>
          <div className="relative w-full max-w-[440px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] text-center animate-slideUp">
            <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />
            <div className="relative z-10 p-8">
              <div className="text-5xl mb-4">◆</div>
              <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-2">CoBrother Help Activated!</h2>
              <p className="text-gray-500 mb-5 leading-relaxed">
                A CoBrother will reach out within <strong className="text-purple-600">24 hours</strong>{' '}
                to help with <strong className="text-gray-900">{helpSuccess.software?.name}</strong>.
              </p>
              <div className="px-3.5 py-3 bg-green-500/8 border border-green-500/20 rounded-[10px] mb-6 text-xs text-green-400">
                ✓ {formatPrice(1000)} paid · CoBrother assigned · Expect contact via email
              </div>
              <button className="btn-glow w-full" onClick={() => setHelpSuccess(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

/* ─────────────────────────────────────────────────────────
   Domain Purchase Row
───────────────────────────────────────────────────────── */
function DomainPurchaseRow({ domain }) {
  const { formatPrice } = useCurrency();
  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-700 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded">◇ Domain</span>
            {domain.verified && <span className="text-xs font-bold text-green-600">✓ Verified</span>}
          </div>
          <div className="font-bold text-lg text-gray-900">
            {domain.domainName}{domain.domainExtension}
          </div>
          <div className="text-xs text-gray-600">{domain.pricingDemand}</div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="font-display text-xl font-bold text-green-600">
            {formatPrice(domain.askingPrice)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Software Purchase Row
───────────────────────────────────────────────────────── */
function SoftwarePurchaseRow({ purchase, onGetHelp, onDownloadInvoice }) {
  const { formatPrice } = useCurrency();
  const sw      = purchase.software || {};
  const helpPaid  = purchase.coBrotherHelpPaid;
  const confirmed = purchase.completionStatus === 'CONFIRMED';
  const HELP_FEE_INR = 1000;

  return (
    <div className={`p-5 bg-white rounded-xl shadow-sm ${helpPaid ? 'border border-green-300' : 'border border-gray-200'}`}>
      <div className="flex justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded">⟁ Software</span>
            {confirmed && <span className="text-xs font-bold text-green-600">✓ Completed</span>}
            {helpPaid && <span className="text-xs font-bold text-green-600 bg-green-100 border border-green-200 px-2 py-0.5 rounded">◆ CoBrother Active</span>}
          </div>
          <div className="font-bold text-lg text-gray-900">
            {sw.name || '—'}
          </div>
          {sw.description && (
            <div className="text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap max-w-[400px]">
              {sw.description}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
          <div className="font-display text-xl font-bold text-purple-700">
            {formatPrice(sw.price || 0)}
          </div>
          {helpPaid && <div className="text-xs text-gray-600">+ {formatPrice(HELP_FEE_INR)} CoBrother</div>}
          <div className="text-xs text-gray-600">✓ Payment Confirmed</div>
          <InvoiceDownloadButton onClick={onDownloadInvoice} />
        </div>
      </div>

      {sw.githubLink && (
        <div className="mt-3.5 p-4 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-between">
          <span className="text-xs text-gray-600">🔗 GitHub Repository</span>
          <a href={sw.githubLink} target="_blank" rel="noreferrer" className="text-xs text-gray-700 font-bold hover:text-gray-900 transition-all duration-200">
            Open →
          </a>
        </div>
      )}

      <div className="mt-3.5">
        {helpPaid ? (
          <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
            <div className="font-bold text-sm text-green-600 mb-1">◆ CoBrother Helper Assigned</div>
            <div className="text-xs text-gray-600 leading-relaxed">
              Check your email for introduction details from your assigned CoBrother.
            </div>
          </div>
        ) : (
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-sm text-purple-700 mb-1">Need help getting started?</div>
              <div className="text-xs text-gray-600 leading-relaxed">
                Get a dedicated CoBrother to guide you through setup and deployment.
              </div>
            </div>
            <button onClick={onGetHelp} className="btn-glow btn-glow-sm">
              Get Help — {formatPrice(HELP_FEE_INR)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Reusable Download Button
───────────────────────────────────────────────────────── */
function InvoiceDownloadButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-all duration-200 bg-white hover:bg-gray-50 group"
    >
      <svg
        className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors"
        viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 1v9m0 0L5 7m3 3 3-3M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Invoice
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
   CoBrother Help Modal (unchanged)
───────────────────────────────────────────────────────── */
function CoBrotherHelpModal({ purchase, onClose, onSuccess }) {
  const { user } = useAuth();
  const { currency, formatPrice } = useCurrency();
  const HELP_FEE_INR = 1000;
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const sw = purchase.software || {};

  const handlePay = async () => {
    setLoading(true); setError('');
    try {
      const { data: orderData } = await technologyAPI.payCoBrotherHelp(purchase.id, {
        ...buildOrderCurrencyPayload(currency),
      });
      openRazorpayCheckout({
        orderData,
        user,
        description: `CoBrother Help — ${sw.name}`,
        themeColor: '#7c3aed',
        onSuccess: async (response) => {
          try {
            await technologyAPI.verifyCoBrotherHelp(purchase.id, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId:   response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess({ ...purchase, coBrotherOptIn: true, coBrotherHelpPaid: true });
          } catch {
            setError('Payment verification failed.');
            setLoading(false);
          }
        },
        onFailure: () => { setError('Payment failed.'); setLoading(false); },
        onDismiss: () => setLoading(false),
      });
    } catch (err) { setError(err.response?.data?.error || 'Failed.'); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[500px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] text-center animate-slideUp">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />
        <div className="relative z-10 p-8">
          <div className="modal-badge" style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' }}>◆ CoBrother Help</div>
          <h2>{sw.name}</h2>
          <p>Get a dedicated expert to help you succeed with this software.</p>
        </div>
        <div className="p-8">
          <div className="mb-6">
            {['Dedicated CoBrother assigned within 24 hours',
              'Personalised onboarding and setup guidance',
              'Help with deployment, configuration, and integration',
              'Direct communication channel with your helper'].map((line, i) => (
              <div key={i} className="flex items-center gap-2 mb-3">
                <span className="text-green-600 text-sm">✓</span>
                <span className="text-gray-600 text-sm leading-relaxed">{line}</span>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="text-xs text-gray-600 font-bold uppercase mb-2">Billing Summary</div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 text-sm">Software (already paid)</span>
              <span className="text-gray-600 text-sm">{formatPrice(sw.price || 0)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 text-sm">CoBrother Helper Fee</span>
              <span className="text-gray-600 text-sm font-bold">{formatPrice(HELP_FEE_INR)}</span>
            </div>
            <div className="h-1 bg-gray-200 mb-2" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900 text-sm">Paying Today</span>
              <span className="font-display text-lg font-bold text-purple-700">{formatPrice(HELP_FEE_INR)}</span>
            </div>
          </div>
          {error && <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-xs text-red-600 mb-6">{error}</div>}
          <div className="flex gap-3">
            <button className="btn-glow w-full" onClick={handlePay} disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : `Pay ${formatPrice(HELP_FEE_INR)} — Get Help →`}
            </button>
            <button className="btn-glow w-full" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Stat Card (unchanged)
───────────────────────────────────────────────────────── */
function StatCard({ label, value, iconSrc, color = '#111827' }) {
  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="w-8 h-8 mb-2">
        <img src={iconSrc} alt={label} className="w-full h-full object-contain" />
      </div>
      <div className="text-2xl font-bold font-display" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-600 font-semibold mt-1">{label}</div>
    </div>
  );
}
