import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '../api/services';
import { formatAuctionDate, formatAuctionDateTime } from '../utils/auctionDate';
import useCurrency from '../context/CurrencyContext';

const STATUS_COLORS = {
  TAKEN_DOWN: '#dc2626',
};

export default function SoftwareAuctionTakeDownTab() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getTakenDownSoftwareAuctions();
      setAuctions(data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading taken down auctions...</div>;
  }

  if (auctions.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No taken down software auctions.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p className="text-sm text-gray-500 mb-3">{auctions.length} Taken Down Auctions</p>
      {auctions.map((item) => {
        const auction = item.auction ?? item;
        const software = item.software ?? {};
        const lister = software.listedBy ?? {};
        const bids = item.bids ?? [];
        const isExpanded = expandedRow === auction.id;

        return (
          <div key={auction.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: 56, height: 56, background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {software.logoUrl ? (
                    <img src={software.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>💻</span>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                    {software.name || 'Unnamed Software'}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.88rem', color: '#6b7280', flexWrap: 'wrap' }}>
                    <span>By: <strong style={{ color: '#374151' }}>{lister.displayName || lister.firstName || 'Unknown'}</strong></span>
                    <span>Min Bid: <strong style={{ color: '#374151' }}>{formatPrice(auction.minBidPrice)}</strong></span>
                    <span>Bids: <strong style={{ color: '#374151' }}>{auction.totalBids || 0}</strong></span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ padding: '0.35rem 0.6rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(220,38,38,0.2)' }}>
                  TAKEN DOWN
                </div>
                <button
                  onClick={() => setExpandedRow(isExpanded ? null : auction.id)}
                  style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
                <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: 8, border: '1px solid #fee2e2' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '0.88rem', fontWeight: 700 }}>Takedown Reason</h4>
                  <p style={{ margin: 0, color: '#b91c1c' }}>{auction.takeDownReason || 'No reason provided'}</p>
                  {auction.takeDownDescription && (
                    <p style={{ margin: '0.5rem 0 0 0', color: '#b91c1c', fontSize: '0.8rem' }}>{auction.takeDownDescription}</p>
                  )}
                  <p style={{ margin: '0.5rem 0 0 0', color: '#f87171', fontSize: '0.75rem' }}>
                    Taken down at: {formatAuctionDateTime(auction.takenDownAt, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric' }, '—')}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
