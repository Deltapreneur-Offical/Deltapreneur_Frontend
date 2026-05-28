import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gem, CheckCircle2, IndianRupee, ShoppingCart, CreditCard, Gavel, ShieldCheck, Share2, X } from 'lucide-react';
import { domainAPI } from '../api/services';
import useCurrency from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import DomainVerificationModal from './DomainVerificationModal';
import { APP_BASE_URL } from '../config/urls';
import { extractDomainList } from '../utils/domainApiAdapter';


const STATUS_COLORS = {
  AVAILABLE: { color: '#6ec896', bg: 'rgba(110,200,150,0.1)', border: 'rgba(110,200,150,0.3)' },
  PENDING:   { color: '#c8a96e', bg: 'rgba(200,169,110,0.1)', border: 'rgba(200,169,110,0.3)' },
  SOLD:      { color: '#c86e6e', bg: 'rgba(200,110,110,0.1)', border: 'rgba(200,110,110,0.3)' },
};

const PAYMENT_COLORS = {
  COMPLETED: { color: '#6ec896' },
  CREATED:   { color: '#c8a96e' },
  FAILED:    { color: '#c86e6e' },
};

export default function DomainsDashboardPage() {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [tab, setTab]               = useState('listings');
  const [listings, setListings]     = useState([]);
  const [purchases, setPurchases]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [verifyTarget, setVerifyTarget] = useState(null);


  useEffect(() => {
    Promise.all([domainAPI.getMyListings(), domainAPI.getMyPurchases()])
      .then(([l, p]) => {
        setListings(extractDomainList(l.data));
        setPurchases(extractDomainList(p.data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = listings
    .filter(d => d.domainStatus === 'SOLD')
    .reduce((sum, d) => sum + d.askingPrice, 0);

  const totalSpent = purchases
    .filter(d => d.paymentStatus === 'COMPLETED')
    .reduce((sum, d) => sum + d.askingPrice, 0);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-0">Domains Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your domain listings and purchases.</p>
          </div>
          <button className="btn-glow btn-glow-sm" onClick={() => navigate('/domains')}>
            <ArrowLeft size={16} /> Back to Domains
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-gray-600 mb-2">Total Listings</div>
            <div className="text-2xl font-bold text-black/70">{listings.length}</div>
            <div className="text-xs text-gray-600 font-semibold mt-1">Listings</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-gray-600 mb-2">Active</div>
            <div className="text-2xl font-bold text-black/70">{listings.filter(d => d.domainStatus === 'AVAILABLE').length}</div>
            <div className="text-xs text-gray-600 font-semibold mt-1">Active Listings</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-gray-600 mb-2">Sold</div>
            <div className="text-2xl font-bold text-black/70">{listings.filter(d => d.domainStatus === 'SOLD').length}</div>
            <div className="text-xs text-gray-600 font-semibold mt-1">Sold Listings</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-gray-600 mb-2">Revenue</div>
            <div className="text-2xl font-bold text-black/70">{formatPrice(totalRevenue)}</div>
            <div className="text-xs text-gray-600 font-semibold mt-1">Total Revenue</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-gray-600 mb-2">Purchased</div>
            <div className="text-2xl font-bold text-black/70">{purchases.length}</div>
            <div className="text-xs text-gray-600 font-semibold mt-1">Purchases</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-gray-600 mb-2">Total Spent</div>
            <div className="text-2xl font-bold text-black/70">{formatPrice(totalSpent)}</div>
            <div className="text-xs text-gray-600 font-semibold mt-1">Total Spent</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button className={`btn-glow btn-glow-sm ${tab === 'listings' ? 'bg-gray-900 text-white border-gray-900' : ''}`} onClick={() => setTab('listings')}>
            My Listings ({listings.length})
          </button>
          <button className={`btn-glow btn-glow-sm ${tab === 'purchases' ? 'bg-gray-900 text-white border-gray-900' : ''}`} onClick={() => setTab('purchases')}>
            My Purchases ({purchases.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : tab === 'listings' ? (
          listings.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">◇</div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No listings yet</h3>
              <p className="text-gray-600 mb-6">List your first domain to start selling.</p>
              <button className="btn-glow" onClick={() => navigate('/domains')}>List a Domain</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {listings.map(d => (
                <DomainRow
                  key={d.id}
                  domain={d}
                  type="listing"
                  onVerify={() => setVerifyTarget(d)}
                />
              ))}
            </div>
          )
        ) : (
          purchases.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No purchases yet</h3>
              <p className="text-gray-600 mb-6">Browse domains and make your first purchase.</p>
              <button className="btn-glow" onClick={() => navigate('/domains')}>Browse Domains</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {purchases.map(d => <DomainRow key={d.id} domain={d} type="purchase" />)}
            </div>
          )
        )}
      </div>
      {verifyTarget && (
        <DomainVerificationModal
          domain={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onVerified={() => {
            setListings(prev => prev.map(d =>
              d.id === verifyTarget.id ? { ...d, verified: true } : d
            ));
            setVerifyTarget(null);
          }}
        />
      )}
    </AppLayout>
  );
}

function DomainRow({ domain, type, onVerify }) {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const s = STATUS_COLORS[domain.domainStatus] || STATUS_COLORS.AVAILABLE;
  const p = domain.paymentStatus ? PAYMENT_COLORS[domain.paymentStatus] : null;

  const isAuction  = domain.saleType === 'AUCTION';
  const auction    = domain.auction;
  const auctionId  = auction?.id;

  // Close share dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const shareBase = APP_BASE_URL.replace(/\/$/, '');
  const shareUrl = `${shareBase}/domains`;
  const shareText = `Check out this domain: ${domain.domainName}${domain.domainExtension} - Listed on CoBrother!`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };
 
  const AUCTION_STATUS_COLORS = {
    DRAFT:    '#888',
    ACTIVE:   '#6ec896',
    EXTENDED: '#c8a96e',
    ENDED:    '#a06ec8',
    UNSOLD:   '#c86e6e',
    CLOSED:   '#666',
  };
 
  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-[10px] px-5 py-4 gap-3 transition-all hover:-translate-y-px hover:shadow-lg">
      <div>
        <div className="font-bold text-gray-900 text-base flex items-center gap-2">
          {domain.domainName}{domain.domainExtension}
          {isAuction && (
            <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
              <Gavel size={13} /> Auction
            </span>
          )}
        </div>
        <div className="text-[0.8rem] text-gray-500 mt-0.5">
          {domain.pricingDemand}
          {isAuction && auction && (
            <span style={{ marginLeft: '0.5rem', color: AUCTION_STATUS_COLORS[auction.status] || '#888' }}>
              · {auction.status}
              {auction.status === 'ACTIVE' || auction.status === 'EXTENDED'
                ? ` · ${auction.totalBids} bid${auction.totalBids !== 1 ? 's' : ''}`
                : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {!isAuction && (
          <span className="text-[0.95rem] font-bold text-gray-900">
            {formatPrice(domain.askingPrice)}
          </span>
        )}
        {isAuction && auction?.currentHighestBid > 0 && (
          <span className="text-[0.875rem] font-bold text-green-600">
            Top: {formatPrice(auction.currentHighestBid)}
          </span>
        )}
        {isAuction && auction?.minBidPrice > 0 && auction?.currentHighestBid === 0 && (
          <span className="text-[0.875rem] font-bold text-amber-600">
            Min: {formatPrice(auction.minBidPrice)}
          </span>
        )}

        <span className="px-2.5 py-1 rounded-md text-[0.72rem] font-semibold" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
          {domain.domainStatus}
        </span>

        {domain.takenDown && (
          <span className="text-[0.72rem] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
            ⚠ Taken Down
          </span>
        )}
        {domain.takenDown && domain.takeDownReason && (
          <span className="text-[0.72rem] text-gray-400 italic">
            Reason: {domain.takeDownReason}
          </span>
        )}

        {p && !isAuction && (
          <span className="text-[0.72rem] font-semibold" style={{ color: p.color }}>
            {domain.paymentStatus === 'COMPLETED' && '✓ Paid'}
            {domain.paymentStatus === 'CREATED'   && '⏳ Pending'}
            {domain.paymentStatus === 'FAILED'    && '✕ Failed'}
          </span>
        )}

        {type === 'purchase' && domain.paymentStatus === 'COMPLETED' && (
          <span className="text-[0.75rem] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
            ⏳ Transfer within 24hrs
          </span>
        )}

        {/* Auction action buttons */}
        {type === 'listing' && isAuction && auctionId && (
          <button className="btn-glow btn-glow-sm"
            onClick={() => navigate(`/auction/${auctionId}`)}>
            <Gavel size={13} /> View Auction →
          </button>
        )}

        {/* Verify button — only for non-auction or unverified auction drafts */}
        {type === 'listing' && domain.verified && (
          <span className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md">
            <ShieldCheck size={14} /> Verified
          </span>
        )}

        {type === 'listing' && !domain.verified && domain.domainStatus === 'AVAILABLE' && (
          <button className="btn-glow btn-glow-sm" onClick={onVerify}>
            🔍 Verify
            {isAuction && auction?.status === 'DRAFT' && ' (Starts Auction)'}
          </button>
        )}

        {/* Share Button */}
        <div className="relative" ref={shareRef}>
          <button
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-gray-600 hover:text-gray-900"
            onClick={() => setShareOpen(!shareOpen)}
            title="Share"
          >
            <Share2 size={16} />
          </button>

          {shareOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-semibold text-gray-500">Share via</span>
              </div>
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                onClick={() => handleShare(linkedinShare)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                onClick={() => handleShare(facebookShare)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                onClick={() => handleShare(whatsappShare)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}