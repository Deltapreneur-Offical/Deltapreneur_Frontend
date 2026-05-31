import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Boxes, IndianRupee, ShoppingCart, CreditCard, Clock3 } from 'lucide-react';
import { cocreationAPI } from '../api/services';
import useCurrency from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';

export default function CoCreationDashboardPage() {
  const { formatPrice } = useCurrency();
  const navigate                        = useNavigate();
  const [tab, setTab]                   = useState('listings');
  const [listings, setListings]         = useState([]);   // Software[]  (with purchaseCount)
  const [purchases, setPurchases]       = useState([]);   // SoftwarePurchase[]
  const [loading, setLoading]           = useState(true);
  const [confirmingId, setConfirmingId] = useState(null); // purchaseId being confirmed
  const [githubModal, setGithubModal]   = useState(null); // { link, softwareName }

  const load = () => {
    setLoading(true);
    Promise.all([
      cocreationAPI.getMyListings(),
      cocreationAPI.getMyPurchases(),
    ]).then(([l, p]) => {
      setListings(Array.isArray(l.data) ? l.data : (l.data?.data ?? []));
      setPurchases(Array.isArray(p.data) ? p.data : (p.data?.data ?? []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = async (purchaseId, softwareName) => {
    setConfirmingId(purchaseId);
    try {
      const { data } = await cocreationAPI.confirmPurchase(purchaseId);
      if (data.githubLink) {
        setGithubModal({ link: data.githubLink, softwareName });
      }
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to confirm. Please try again.');
    } finally { setConfirmingId(null); }
  };

  // Stats
  const completedPurchases = purchases.filter(p => p.paymentStatus === 'COMPLETED');
  const totalRevenue = listings.reduce((sum, s) => sum + (s.price * (s.purchaseCount || 0)), 0);
  const totalSpent   = completedPurchases.reduce((sum, p) => sum + (p.software?.price || 0), 0);
  const pendingConfirm = completedPurchases.filter(p => p.completionStatus === 'PENDING').length;

  return (
    <AppLayout>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">Technology Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your software listings and purchases.</p>
          </div>
          <button className="btn-glow btn-glow-sm" onClick={() => navigate('/technology')}>
            <ArrowLeft size={16} /> Back to Technology
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard label="Total Listings" value={listings.length} icon={<Boxes size={18} />} />
          <StatCard label="Total Sales" value={listings.reduce((s, x) => s + (x.purchaseCount || 0), 0)}
                    icon={<IndianRupee size={18} />} color="#047857" />
          <StatCard label="Revenue" value={formatPrice(totalRevenue)}
                    icon={<IndianRupee size={18} />} color="#047857" />
          <StatCard label="My Purchases" value={completedPurchases.length} icon={<ShoppingCart size={18} />} color="#6d28d9" />
          <StatCard label="Total Spent" value={formatPrice(totalSpent)}
                    icon={<CreditCard size={18} />} color="#1d4ed8" />
          {pendingConfirm > 0 && (
            <StatCard label="Awaiting Confirm" value={pendingConfirm}
                      icon={<Clock3 size={18} />} color="#7e22ce" />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button className={`btn-glow btn-glow-sm ${tab === 'listings' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => setTab('listings')}>
            My Listings ({listings.length})
          </button>
          <button className={`btn-glow btn-glow-sm relative ${tab === 'purchases' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => setTab('purchases')}>
            My Purchases ({completedPurchases.length})
            {pendingConfirm > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingConfirm}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : tab === 'listings' ? (
          listings.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">⟁</div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No listings yet</h3>
              <button className="btn-glow" onClick={() => navigate('/technology')}>
                List Software
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {listings.map(s => (
                <ListingRow
                  key={s.id}
                  item={s}
                  onAnalytics={() => navigate(`/technology/${s.id}/analytics`)}
                />
              ))}
            </div>
          )
        ) : (
          completedPurchases.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No purchases yet</h3>
              <button className="btn-glow" onClick={() => navigate('/technology')}>
                Browse Technology
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {completedPurchases.map(p => (
                <PurchaseRow
                  key={p.id}
                  purchase={p}
                  onConfirm={() => handleConfirm(p.id, p.software?.name)}
                  confirming={confirmingId === p.id}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* GitHub link reveal modal */}
      {githubModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setGithubModal(null)}>
          <div className="relative w-full max-w-[440px] text-center bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8"
               onClick={e => e.stopPropagation()}>
            <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
            <div className="text-[2.5rem] mb-4">🔓</div>
            <h2 className="font-display text-[1.75rem] text-gray-900 mb-2">
              Purchase Confirmed!
            </h2>
            <p className="text-gray-500 mb-5">
              Thanks for confirming <strong className="text-gray-900">
                {githubModal.softwareName}</strong>.
            </p>
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-lg mb-5 break-all">
              <div className="text-[0.72rem] text-gray-400 mb-1.5">
                🔗 GitHub Repository
              </div>
              <a href={githubModal.link} target="_blank" rel="noreferrer"
                 className="text-green-600 font-semibold text-sm no-underline hover:underline">
                {githubModal.link}
              </a>
            </div>
            <button className="btn-glow w-full" onClick={() => setGithubModal(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ─── Listing Row (seller view) ────────────────────────────────────────────────
function ListingRow({ item, onAnalytics }) {
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const sales = item.purchaseCount || 0;

  return (
    <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer"
           onClick={() => setExpanded(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-[0.95rem]">
            {item.name}
            {item.official && (
              <span className="ml-2 text-[0.68rem] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                ✦ Official
              </span>
            )}
          </div>
          <div className="text-[0.78rem] text-gray-400 mt-0.5">
            {item.category?.replace(/_/g, ' ')} · {item.pricingDemand}
          </div>
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="text-right">
            <div className="font-display text-[1.1rem] font-bold text-indigo-600">
              {formatPrice(item.price)}
            </div>
            <div className="text-[0.72rem] text-gray-400">per sale</div>
          </div>
          <div className="text-center">
            <div className="font-display text-[1.3rem] font-bold text-green-600">
              {sales}
            </div>
            <div className="text-[0.68rem] text-gray-400">
              {sales === 1 ? 'buyer' : 'buyers'}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[1.1rem] font-bold text-green-600">
              {formatPrice(item.price * sales)}
            </div>
            <div className="text-[0.72rem] text-gray-400">revenue</div>
          </div>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-3.5 flex gap-3 flex-wrap items-center">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-gray-500 font-semibold text-xs rounded-lg border border-gray-200 cursor-pointer transition-colors hover:bg-gray-50" onClick={onAnalytics}>
            📊 Analytics
          </button>
          <span className="text-[0.78rem] text-gray-400">
            👁 {item.views || 0} views · ✦ {sales} paid
            {sales > 0 && ` · Revenue: ${formatPrice(item.price * sales)}`}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Purchase Row (buyer view) ────────────────────────────────────────────────
function PurchaseRow({ purchase, onConfirm, confirming }) {
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const sw           = purchase.software || {};
  const isConfirmed  = purchase.completionStatus === 'CONFIRMED';
  const isPending    = purchase.completionStatus === 'PENDING' &&
                       purchase.paymentStatus === 'COMPLETED';
  const helpPaid     = purchase.coBrotherHelpPaid;

  return (
    <div className={`bg-white border rounded-[10px] overflow-hidden ${isConfirmed ? 'border-green-200' : isPending ? 'border-purple-200' : 'border-gray-200'}`}>
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer"
           onClick={() => setExpanded(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-[0.95rem] flex items-center gap-2 flex-wrap">
            {sw.name || '—'}
            {isConfirmed && (
              <span className="text-[0.68rem] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                ✓ Confirmed
              </span>
            )}
            {isPending && (
              <span className="text-[0.68rem] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                ⏳ Awaiting Confirmation
              </span>
            )}
            {helpPaid && (
              <span className="text-[0.68rem] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                ◆ CoBrother Active
              </span>
            )}
          </div>
          <div className="text-[0.78rem] text-gray-400 mt-0.5">
            {sw.category?.replace(/_/g, ' ')} · Purchased{' '}
            {purchase.soldAt
              ? new Date(purchase.soldAt).toLocaleDateString('en-IN',
                  { day: 'numeric', month: 'short', year: 'numeric' })
              : ''}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="font-display text-[1.1rem] font-bold text-purple-600">
              {formatPrice(sw.price || 0)}
            </div>
            {purchase.coBrotherOptIn && !helpPaid && (
              <div className="text-[0.68rem] text-gray-400">+ {formatPrice(1000)} pending</div>
            )}
            {helpPaid && (
              <div className="text-[0.68rem] text-gray-400">+ {formatPrice(1000)} CoBrother</div>
            )}
          </div>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">

          {/* GitHub access */}
          {sw.githubLink && (
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg mb-3.5 flex items-center justify-between">
              <span className="text-[0.82rem] text-gray-500">🔗 GitHub Repository</span>
              <a href={sw.githubLink} target="_blank" rel="noreferrer"
                 className="text-sm text-green-600 font-semibold no-underline hover:underline">
                Open →
              </a>
            </div>
          )}

          {/* CoBrother status */}
          {helpPaid ? (
            <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg mb-3.5 text-[0.82rem] text-green-700">
              ◆ CoBrother assigned — check your email for introduction details.
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            {isPending && (
              <button
                className="btn-glow btn-glow-sm"
                onClick={onConfirm}
                disabled={confirming}>
                {confirming ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : '✓ Mark as Complete'}
              </button>
            )}
            {isConfirmed && (
              <span className="text-[0.78rem] text-green-600 font-semibold self-center">
                ✓ Purchase confirmed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color = '#111827' }) {
  return (
    <div className="card-glow-hover p-4 bg-white border border-gray-200 rounded-[12px] flex flex-col gap-1">
      <div className="text-indigo-500 mb-1">{icon}</div>
      <div className="font-display text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{label}</div>
    </div>
  );
}