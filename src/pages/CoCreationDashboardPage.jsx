import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Boxes, IndianRupee, ShoppingCart, CreditCard, Clock3 } from 'lucide-react';
import { technologyAPI, softwareAuctionAPI } from '../api/services';
import useCurrency from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import TechnologyIcon from '../assets/CoCreation.png';
import { formatAuctionDate } from '../utils/auctionDate';
import SoftwareAuctionRequestModal from './SoftwareAuctionRequestModal';
import VerificationStatusBadge from '../components/listings/VerificationStatusBadge';
import { VerificationProgressModal } from '../components/listings/TechnologyVerificationProgress';
import {
  canRequestTechnologyAuction,
  isTechnologyAuctionLive,
  isTechnologyAuctionPending,
  technologyAuctionId,
} from '../utils/technologyAuctionUi';
import PayoutSettingsButton from '../components/payout/PayoutSettingsButton';
import PayoutProfileBanner from '../components/payout/PayoutProfileBanner';
import MyTechnologiesTab from '../components/profile/MyTechnologiesTab';

export default function CoCreationDashboardPage() {
  const { formatPrice } = useCurrency();
  const navigate                        = useNavigate();
  const [tab, setTab]                   = useState('listings');
  const [listings, setListings]         = useState([]);   // Software[]  (with purchaseCount)
  const [purchases, setPurchases]       = useState([]);   // SoftwarePurchase[]
  const [soldTransfers, setSoldTransfers] = useState([]); // SoftwarePurchase[]
  const [loading, setLoading]           = useState(true);
  const [confirmingId, setConfirmingId] = useState(null); // purchaseId being confirmed
  const [githubModal, setGithubModal]   = useState(null); // { link, softwareName }
  const [auctionTarget, setAuctionTarget] = useState(null);
  const [auctionStatuses, setAuctionStatuses] = useState({});
  const [verificationTarget, setVerificationTarget] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      technologyAPI.getMyListings(),
      technologyAPI.getMyPurchases(),
      technologyAPI.getMySales().catch(() => ({ data: [] })),
    ]).then(([l, p, s]) => {
      setListings(Array.isArray(l.data) ? l.data : (l.data?.data ?? []));
      setPurchases(Array.isArray(p.data) ? p.data : (p.data?.data ?? []));
      setSoldTransfers(Array.isArray(s.data) ? s.data : (s.data?.data ?? []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (listings.length === 0) return;
    listings.forEach((item) => {
      softwareAuctionAPI.getBySoftware(item.id)
        .then(({ data }) => {
          setAuctionStatuses(prev => ({
            ...prev,
            [item.id]: data?.auction ?? data?.data?.auction ?? null,
          }));
        })
        .catch(() => {});
    });
  }, [listings]);

  const handleAuctionSubmitted = () => {
    const targetId = auctionTarget?.id;
    setAuctionTarget(null);
    alert('Auction request submitted! An admin will review it shortly.');
    if (targetId) {
      softwareAuctionAPI.getBySoftware(targetId)
        .then(({ data }) => {
          setAuctionStatuses(prev => ({
            ...prev,
            [targetId]: data?.auction ?? data?.data?.auction ?? null,
          }));
        })
        .catch(() => {});
    }
    load();
  };

  const handleConfirm = async (purchaseId, softwareName) => {
    setConfirmingId(purchaseId);
    try {
      const { data } = await technologyAPI.confirmPurchase(purchaseId);
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
  const totalPurchases = listings.reduce((sum, s) => sum + (s.purchaseCount || 0), 0);
  const totalRevenue = listings.reduce((sum, s) => sum + (s.price * (s.purchaseCount || 0)), 0);
  const totalSpent   = completedPurchases.reduce((sum, p) => sum + (p.software?.price || 0), 0);
  const pendingConfirm = completedPurchases.filter(p => p.completionStatus === 'PENDING').length;

  return (
    <AppLayout>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">Technology Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your technology listings and purchases.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PayoutSettingsButton />
            <button className="btn-glow btn-glow-sm" onClick={() => navigate('/technology')}>
              <ArrowLeft size={16} /> Back to Technology
            </button>
          </div>
        </div>

        <PayoutProfileBanner context="technology" className="mb-6" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Listings" value={listings.length} icon={<Boxes size={18} />} />
          <StatCard label="Total Purchases" value={totalPurchases}
                    icon={<IndianRupee size={18} />} color="#047857" />
          <StatCard label="Revenue" value={formatPrice(totalRevenue)}
                    icon={<IndianRupee size={18} />} color="#047857" />
          <StatCard label="My Purchases" value={completedPurchases.length} icon={<ShoppingCart size={18} />} color="#c2410c" />
          <StatCard label="Total Spent" value={formatPrice(totalSpent)}
                    icon={<CreditCard size={18} />} color="#c2410c" />
          {pendingConfirm > 0 && (
            <StatCard label="Awaiting Confirm" value={pendingConfirm}
                      icon={<Clock3 size={18} />} color="#c2410c" />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button className={`btn-glow btn-glow-sm ${tab === 'listings' ? 'dashboard-active-control' : ''}`}
            onClick={() => setTab('listings')}>
            My Listings ({listings.length})
          </button>
          <button className={`btn-glow btn-glow-sm relative ${tab === 'purchases' ? 'dashboard-active-control' : ''}`}
            onClick={() => setTab('purchases')}>
            My Purchases ({completedPurchases.length})
            {pendingConfirm > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingConfirm}
              </span>
            )}
          </button>
          <button className={`btn-glow btn-glow-sm ${tab === 'sold' ? 'dashboard-active-control' : ''}`}
            onClick={() => setTab('sold')}>
            Sold Listings ({soldTransfers.length})
          </button>
          <button className={`btn-glow btn-glow-sm ${tab === 'services' ? 'dashboard-active-control' : ''}`}
            onClick={() => setTab('services')}>
            My Technologies (Services)
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : tab === 'services' ? (
          <MyTechnologiesTab />
        ) : tab === 'sold' ? (
          soldTransfers.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No sold listings yet</h3>
              <p className="text-gray-500 text-sm mt-1">When someone buys one of your listings, it will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {soldTransfers.map(tx => (
                <SoldRow
                  key={tx.id}
                  tx={tx}
                />
              ))}
            </div>
          )
        ) : tab === 'listings' ? (
          listings.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-6">
                <img src={TechnologyIcon} alt="" className="w-20 h-20 object-contain opacity-30" />
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No listings yet</h3>
              <button className="btn-glow" onClick={() => navigate('/technology')}>
                List Technology
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {listings.map(s => (
                <ListingRow
                  key={s.id}
                  item={s}
                  auctionStatus={auctionStatuses[s.id]}
                  onShowVerification={() => setVerificationTarget(s)}
                  onAnalytics={() => navigate(`/technology/${s.id}/analytics`)}
                  onAuction={() => setAuctionTarget(s)}
                  onViewAuction={(auctionId) => navigate(`/technology/auction/${auctionId}`)}
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

      {auctionTarget && (
        <SoftwareAuctionRequestModal
          software={auctionTarget}
          onClose={() => setAuctionTarget(null)}
          onSubmitted={handleAuctionSubmitted}
        />
      )}

      <VerificationProgressModal
        open={Boolean(verificationTarget)}
        onClose={() => setVerificationTarget(null)}
        verified={Boolean(verificationTarget?.verified)}
        itemName={verificationTarget?.name}
      />

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

const PLAN_LABELS = {
  'ONE_TIME': 'One-Time Purchase',
  '1_MONTH': '1 Month Subscription',
  '3_MONTHS': '3 Months Subscription',
  '6_MONTHS': '6 Months Subscription',
  '12_MONTHS': '12 Months Subscription',
  'ONE_MONTH': '1 Month Subscription',
  'THREE_MONTHS': '3 Months Subscription',
  'SIX_MONTHS': '6 Months Subscription',
  'TWELVE_MONTHS': '12 Months Subscription',
};

// ─── Listing Row (seller view) ────────────────────────────────────────────────
function ListingRow({ item, auctionStatus, onShowVerification, onAnalytics, onAuction, onViewAuction }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const sales = item.purchaseCount || 0;
  const verified = Boolean(item.verified);
  
  return (
    <div className="bg-white border border-gray-200 rounded-[12px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-200 hover:shadow-md transition-all">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-[1.05rem] mb-1.5 flex items-center gap-2 flex-wrap">
          <span className="truncate">{item.name}</span>
          <VerificationStatusBadge item={item} type="badge" />
          {item.technologyType === 'HARDWARE' ? (
            <span className="text-[0.68rem] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
              HARDWARE
            </span>
          ) : (
            <span className="text-[0.68rem] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
              SOFTWARE
            </span>
          )}
        </div>
        <div className="text-[0.8rem] text-gray-500 font-medium">
          {item.category?.replace(/_/g, ' ')}
        </div>
      </div>

      <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
        <div className="flex gap-2 flex-wrap justify-end">
          <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-100 hover:text-gray-900 font-semibold transition-colors" onClick={onAnalytics}>
            📊 Analytics
          </button>
          
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg hover:bg-blue-100 hover:border-blue-300 font-semibold transition-colors"
            onClick={onShowVerification}
          >
            {verified
              ? t('techVerifyTrackerTitleDone', 'Verification complete — view steps')
              : t('techVerifyTrackerTitle', 'View verification progress')}
          </button>

          {canRequestTechnologyAuction(item, auctionStatus) && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg hover:bg-amber-100 font-semibold transition-colors"
              onClick={onAuction}
            >
              🔨 List for auction
            </button>
          )}
          {isTechnologyAuctionLive(item, auctionStatus) && (
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg">
              🟢 On Live Auction
            </span>
          )}
          {!isTechnologyAuctionLive(item, auctionStatus) && isTechnologyAuctionPending(item, auctionStatus) && (
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
              ⏳ Auction Pending
            </span>
          )}
          {technologyAuctionId(item, auctionStatus) && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg hover:bg-green-100 font-semibold transition-colors"
              onClick={() => onViewAuction(technologyAuctionId(item, auctionStatus))}
            >
              {isTechnologyAuctionLive(item, auctionStatus) ? '🟢 View Live Auction' : 'View Auction'}
            </button>
          )}
        </div>
        <div className="text-[0.8rem] text-gray-500 font-medium mt-1">
          👁 {item.views || 0} views <span className="mx-1.5 text-gray-300">•</span> ✦ {sales} paid
          {sales > 0 && <span className="ml-1.5 font-bold text-green-600">({formatPrice(item.price * sales)})</span>}
        </div>
      </div>
    </div>
  );
}


// ─── Purchase Row (buyer view) ────────────────────────────────────────────────
function PurchaseRow({ purchase, onConfirm, confirming }) {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const sw           = purchase.software || {};
  const isTechnologyService = Boolean(
    purchase.isTechnologyService || purchase.activationStatus || purchase.provisioningStatus
  );
  const activationStatus = String(purchase.activationStatus || '').toUpperCase();
  const activationLabel = purchase.activationStatusLabel
    || (activationStatus === 'ACTIVE' ? 'Active'
      : activationStatus === 'PENDING_ACTIVATION' ? 'Pending Activation'
      : activationStatus === 'ACTIVATION_ISSUE' ? 'Activation Issue'
      : null);
  const isConfirmed  = !isTechnologyService && purchase.completionStatus === 'CONFIRMED';
  const isPending    = !isTechnologyService && purchase.completionStatus === 'PENDING' &&
                       purchase.paymentStatus === 'COMPLETED';
  const helpPaid     = purchase.coBrotherHelpPaid;
  const planLabel    = PLAN_LABELS[purchase.pricingPlan] || 'One-Time Purchase';

  const purchaseDate = new Date(purchase.soldAt || purchase.created_at || Date.now());
  let expiryDate = purchase.expiryDate || purchase.expiry_date ? new Date(purchase.expiryDate || purchase.expiry_date) : null;
  let expiryLabel = null;
  let isExpired = false;
  let isExpiringSoon = false;

  if (purchase.pricingPlan && purchase.pricingPlan !== 'ONE_TIME') {
    if (!expiryDate) {
      const months = parseInt(purchase.pricingPlan.split('_')[0], 10);
      if (!isNaN(months)) {
        expiryDate = new Date(purchaseDate);
        expiryDate.setMonth(expiryDate.getMonth() + months);
      }
    }
    if (expiryDate) {
      expiryLabel = `Expires: ${expiryDate.toLocaleDateString()}`;
      const now = new Date();
      isExpired = expiryDate < now;
      isExpiringSoon = !isExpired && (expiryDate.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }
  }

  const handleRenew = (e) => {
    e.stopPropagation();
    navigate(`/technology?item=${sw.id}`);
  };

  return (
    <div className={`bg-white border rounded-[12px] overflow-hidden transition-all ${isConfirmed ? 'border-green-200 shadow-sm' : isPending ? 'border-purple-200 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
           onClick={() => setExpanded(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-[1rem] flex items-center gap-2 flex-wrap mb-1">
            <span className="truncate">{sw.name || '—'}</span>
            {sw.technologyType === 'HARDWARE' ? (
              <span className="text-[0.65rem] font-bold text-white bg-gray-800 border border-gray-900 px-2 py-0.5 rounded-md tracking-wider">
                HARDWARE
              </span>
            ) : (
              <span className="text-[0.65rem] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md tracking-wider">
                SOFTWARE
              </span>
            )}
            <span className="text-[0.65rem] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md tracking-wider">
              {planLabel}
            </span>
            {isTechnologyService && activationLabel ? (
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md tracking-wider ${
                activationStatus === 'ACTIVE'
                  ? 'text-green-700 bg-green-50 border border-green-200'
                  : activationStatus === 'ACTIVATION_ISSUE'
                    ? 'text-red-700 bg-red-50 border border-red-200'
                    : 'text-amber-800 bg-amber-50 border border-amber-200'
              }`}>
                {activationStatus === 'ACTIVE' ? '✓ Active' : activationLabel}
              </span>
            ) : isConfirmed ? (
              <span className="text-[0.65rem] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md tracking-wider">
                ✓ Confirmed
              </span>
            ) : null}
            {isPending && (
              <span className="text-[0.65rem] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md tracking-wider">
                ⏳ Awaiting Confirmation
              </span>
            )}
            {isExpired && (
              <span className="text-[0.65rem] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md tracking-wider animate-pulse">
                EXPIRED
              </span>
            )}
            {isExpiringSoon && (
              <span className="text-[0.65rem] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md tracking-wider">
                EXPIRING SOON
              </span>
            )}
            {helpPaid && (
              <span className="text-[0.65rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md tracking-wider">
                ◆ Deltapreneur
              </span>
            )}
          </div>
          <div className="text-[0.8rem] text-gray-500 font-medium">
            {sw.category?.replace(/_/g, ' ')} <span className="mx-1.5 text-gray-300">•</span> Purchased{' '}
            {formatAuctionDate(purchaseDate.toISOString(), {
              day: 'numeric', month: 'short', year: 'numeric',
            }, '')}
            {expiryLabel && <><span className="mx-1.5 text-gray-300">•</span> <span className={isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-500'}>{expiryLabel}</span></>}
          </div>
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="text-right">
            <div className="font-display text-[1.2rem] font-bold text-purple-700">
              {formatPrice(sw.price || 0)}
            </div>
            {purchase.coBrotherOptIn && !helpPaid && (
              <div className="text-[0.7rem] text-gray-400 font-medium">+ {formatPrice(1000)} pending</div>
            )}
            {helpPaid && (
              <div className="text-[0.7rem] text-emerald-600 font-medium">+ {formatPrice(1000)} Deltapreneur</div>
            )}
          </div>
          <span className={`text-gray-400 text-sm transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/30 px-5 py-4">

          {/* Purchased Resources */}
          {purchase.paymentStatus === 'COMPLETED' && (
            <div className="mb-5">
              <div className="text-[0.75rem] font-bold text-gray-700 uppercase tracking-wider mb-3">Purchased Resources</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sw.githubLink && (
                  <div className="px-4 py-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-sm hover:border-green-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">🔓</span>
                      <span className="text-[0.85rem] font-semibold text-gray-800">GitHub Repository</span>
                    </div>
                    <a href={sw.githubLink} target="_blank" rel="noreferrer"
                       className="text-sm text-green-600 font-bold no-underline hover:underline bg-green-50 px-3 py-1 rounded-lg">
                      Open →
                    </a>
                  </div>
                )}
                
                {sw.demoUrl && (
                  <div className="px-4 py-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-sm hover:border-indigo-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-500 text-lg">🌐</span>
                      <span className="text-[0.85rem] font-semibold text-gray-800">Demo URL</span>
                    </div>
                    <a href={sw.demoUrl} target="_blank" rel="noreferrer"
                       className="text-sm text-indigo-600 font-bold no-underline hover:underline bg-indigo-50 px-3 py-1 rounded-lg">
                      Open →
                    </a>
                  </div>
                )}
              </div>
              
              {sw.supportingDocuments && sw.supportingDocuments.length > 0 && (
                <div className="mt-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500 text-lg">📄</span>
                    <span className="text-[0.85rem] font-semibold text-gray-800">Supporting Documents</span>
                  </div>
                  <div className="flex flex-col gap-2 pl-7">
                    {sw.supportingDocuments.map((doc, idx) => (
                      <a key={idx} href={doc.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 font-medium hover:underline inline-flex items-center gap-1.5">
                        {doc.name || `Document ${idx + 1}`} <span className="text-xs">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deltapreneur status */}
          {helpPaid && (
            <div className="px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl mb-5 text-[0.85rem] text-emerald-800 font-medium shadow-sm flex items-start gap-2">
              <span className="text-emerald-500 text-lg leading-none mt-0.5">◆</span>
              <span>Deltapreneur assigned — check your email for introduction details.</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-3">
              {isPending && (
                <button
                  className="btn-glow px-4 py-2"
                  onClick={onConfirm}
                  disabled={confirming}>
                  {confirming ? <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin inline-block" /> : '✓ Verify & Mark Complete'}
                </button>
              )}
              {isConfirmed && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[0.8rem] text-green-700 font-bold">
                  ✓ Purchase verified
                </div>
              )}
            </div>
            
            {(isExpired || isExpiringSoon) && (
              <button 
                onClick={handleRenew}
                className={`inline-flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-all ${isExpired ? 'bg-red-600 hover:bg-red-700 text-white shadow-md' : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'}`}
              >
                🔄 Renew Subscription
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Sold Row (seller view of purchases) ──────────────────────────────────────
function SoldRow({ tx }) {
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const sw = tx.software || {};
  const isConfirmed = tx.completionStatus === 'CONFIRMED';
  const isPending = tx.completionStatus === 'PENDING';
  const selectedPlan = tx.selectedPlan || tx.pricingPlan;
  const planLabel = PLAN_LABELS[selectedPlan] || 'One-Time Purchase';
  const saleDate = new Date(tx.soldAt || tx.createdAt || Date.now());

  return (
    <div className={`bg-white border rounded-[12px] overflow-hidden transition-all ${isConfirmed ? 'border-green-200 shadow-sm' : 'border-purple-200 shadow-sm'}`}>
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
           onClick={() => setExpanded(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-[1rem] flex items-center gap-2 flex-wrap mb-1">
            <span className="truncate">{sw.name || '—'}</span>
            {sw.technologyType === 'HARDWARE' ? (
              <span className="text-[0.65rem] font-bold text-white bg-gray-800 border border-gray-900 px-2 py-0.5 rounded-md tracking-wider">
                HARDWARE
              </span>
            ) : (
              <span className="text-[0.65rem] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md tracking-wider">
                SOFTWARE
              </span>
            )}
            <span className="text-[0.65rem] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md tracking-wider">
              {planLabel}
            </span>
            {isConfirmed ? (
              <span className="text-[0.65rem] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md tracking-wider">
                ✓ Confirmed by Buyer
              </span>
            ) : (
              <span className="text-[0.65rem] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md tracking-wider">
                ⏳ Delivery Pending
              </span>
            )}
          </div>
          <div className="text-[0.8rem] text-gray-500 font-medium">
            Buyer: <span className="font-semibold text-gray-700">{tx.buyerFullName || '—'}</span> · Sold{' '}
            {formatAuctionDate(saleDate.toISOString(), {
              day: 'numeric', month: 'short', year: 'numeric',
            }, '')}
          </div>
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="text-right">
            <div className="font-display text-[1.2rem] font-bold text-green-700">
              {formatPrice(tx.grossAmountInr || sw.price || 0)}
            </div>
            {tx.coBrotherOptIn && (
              <div className="text-[0.7rem] text-emerald-600 font-medium">Deltapreneur Assisted</div>
            )}
          </div>
          <span className={`text-gray-400 text-sm transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/30 px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buyer Contact Information */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-[0.72rem] font-bold text-gray-400 uppercase tracking-wider mb-2">Buyer Details</div>
              <div className="text-sm text-gray-700 flex flex-col gap-1.5">
                <div><strong>Full Name:</strong> {tx.buyerFullName || '—'}</div>
                <div><strong>Email:</strong> <a href={`mailto:${tx.buyerEmail}`} className="text-indigo-600 hover:underline">{tx.buyerEmail || '—'}</a></div>
                {tx.buyerPhone && <div><strong>Phone:</strong> {tx.buyerPhone}</div>}
              </div>
            </div>

            {/* Payout Information */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-[0.72rem] font-bold text-gray-400 uppercase tracking-wider mb-2">Payout & Order Details</div>
              <div className="text-sm text-gray-700 flex flex-col gap-1.5">
                <div><strong>Transaction ID:</strong> <span className="font-mono text-xs">{tx.id}</span></div>
                <div>
                  <strong>Payout Status:</strong>{' '}
                  {isConfirmed ? (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Approved (Awaiting Payout Release)
                    </span>
                  ) : (
                    <span className="text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Pending Delivery Confirmation
                    </span>
                  )}
                </div>
              </div>
            </div>
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
