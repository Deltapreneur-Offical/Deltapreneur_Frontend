import { useState } from 'react';
import { softwareAuctionAPI } from '../api/services';
import { formatAuctionDate, formatAuctionDateTime } from '../utils/auctionDate';

const APPROVAL_COLORS = {
  PENDING_APPROVAL: { color: '#c8a96e', bg: 'rgba(200,169,110,0.1)', label: '⏳ Pending Review' },
  APPROVED:         { color: '#6ec896', bg: 'rgba(110,200,150,0.1)', label: '✅ Approved'        },
  REJECTED:         { color: '#c86e6e', bg: 'rgba(200,110,110,0.1)', label: '❌ Rejected'        },
};

const STATUS_COLORS = {
  DRAFT:    '#c8a96e',
  ACTIVE:   '#6ec896',
  EXTENDED: '#c8a96e',
  ENDED:    '#6eadc8',
  UNSOLD:   '#9ca3af',
  CLOSED:   '#6b7280',
};

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 600, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem',
};
const valueStyle = { fontSize: '0.9rem', color: '#111827', fontWeight: 500 };

// ─── Main tab component ───────────────────────────────────────────────────────
export default function SoftwareAuctionAdminTab({ auctions, onRefresh }) {
  const [filter, setFilter] = useState('PENDING_APPROVAL');

  const filtered = filter === 'ALL'
    ? auctions
    : auctions.filter(item => {
        const a = item.auction ?? item;
        return a.approvalStatus === filter;
      });

  const pendingCount = auctions.filter(item =>
    (item.auction ?? item).approvalStatus === 'PENDING_APPROVAL'
  ).length;

  if (auctions.length === 0) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No software auctions yet</h3>
      <p className="text-gray-600">Software auction requests will appear here once listers submit them.</p>
    </div>
  );

  return (
    <div>
      {/* Sub-filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'PENDING_APPROVAL', label: `⏳ Pending Review (${pendingCount})` },
          { id: 'APPROVED',         label: 'Approved' },
          { id: 'REJECTED',         label: 'Rejected' },
          { id: 'ALL',              label: `All (${auctions.length})` },
        ].map(f => (
          <button key={f.id}
            className={`filter-tab ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
            style={{ fontSize: '0.82rem' }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No auctions match this filter.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(item => {
            const auction  = item.auction ?? item;
            const bids     = item.bids    ?? [];
            const software = item.software ?? auction.software ?? {};
            return (
              <SoftwareAuctionAdminRow
                key={auction.id}
                auction={auction}
                bids={bids}
                software={software}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Individual row ───────────────────────────────────────────────────────────
function SoftwareAuctionAdminRow({ auction, bids, software, onRefresh }) {
  const [expanded, setExpanded]       = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [loading, setLoading]         = useState(false);

  const approval = APPROVAL_COLORS[auction.approvalStatus] || APPROVAL_COLORS.PENDING_APPROVAL;
  const isPending = auction.approvalStatus === 'PENDING_APPROVAL';

  const handleApprove = async () => {
    if (!confirm(`Approve auction for "${software.name}"? It will go live immediately.`)) return;
    setLoading(true);
    try {
      await softwareAuctionAPI.adminApprove(auction.id);
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb',
                    borderRadius: 10, overflow: 'hidden',
                    borderLeft: isPending ? '4px solid #c8a96e' : '4px solid transparent' }}>

        {/* Row header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '1rem 1.25rem', cursor: 'pointer' }}
             onClick={() => setExpanded(v => !v)}>

          {/* Software image */}
          {software.imageUrl ? (
            <img src={software.imageUrl} alt={software.name}
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover',
                       border: '1px solid #e5e7eb', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem', flexShrink: 0 }}>⌥</div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
              {software.name || 'Unnamed Software'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem',
                          display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span>Min: ₹{Number(auction.minBidPrice || 0).toLocaleString('en-IN')}</span>
              <span>·</span>
              <span>{auction.duration?.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>{auction.totalBids || 0} bids</span>
              {software.category && (
                <>
                  <span>·</span>
                  <span>{software.category.replace(/_/g, ' ')}</span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {/* Approval badge */}
            <span style={{ fontSize: '0.72rem', fontWeight: 700,
                           color: approval.color, background: approval.bg,
                           border: `1px solid ${approval.color}44`,
                           padding: '0.2rem 0.6rem', borderRadius: 4 }}>
              {approval.label}
            </span>
            {/* Auction status badge (shown once approved) */}
            {auction.approvalStatus === 'APPROVED' && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700,
                             color: STATUS_COLORS[auction.status] || '#888',
                             background: (STATUS_COLORS[auction.status] || '#888') + '18',
                             border: `1px solid ${(STATUS_COLORS[auction.status] || '#888')}33`,
                             padding: '0.2rem 0.6rem', borderRadius: 4 }}>
                {auction.status}
              </span>
            )}
            <span style={{ color: '#9ca3af', marginLeft: '0.25rem' }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '1.25rem' }}>

            {/* Key details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                          gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={labelStyle}>Listed By</div>
                <div style={valueStyle}>
                  {software.listedBy?.firstname} {software.listedBy?.lastname}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  {software.listedBy?.email}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Current Highest Bid</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif',
                              fontSize: '1.25rem', fontWeight: 700,
                              color: auction.currentHighestBid > 0 ? '#6ec896' : '#9ca3af' }}>
                  {auction.currentHighestBid > 0
                    ? `₹${Number(auction.currentHighestBid).toLocaleString('en-IN')}`
                    : '—'}
                </div>
                {auction.currentWinner && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    {auction.currentWinner.firstname} {auction.currentWinner.lastname}
                  </div>
                )}
              </div>
              <div>
                <div style={labelStyle}>Timeline</div>
                <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                  {auction.startTime
                    ? `Started: ${formatAuctionDate(auction.startTime)}`
                    : 'Not started yet'}
                </div>
                {auction.endTime && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    Ends: {formatAuctionDateTime(auction.endTime, {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Auction terms */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                          gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={labelStyle}>Source Code</div>
                <div style={{ fontSize: '0.85rem',
                              color: auction.sourceCodeIncluded ? '#6ec896' : '#9ca3af' }}>
                  {auction.sourceCodeIncluded ? '✓ Included' : '✗ Not included'}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Post-sale Support</div>
                <div style={{ fontSize: '0.85rem',
                              color: auction.supportIncluded ? '#6ec896' : '#9ca3af' }}>
                  {auction.supportIncluded
                    ? `✓ ${auction.supportDays} day${auction.supportDays !== 1 ? 's' : ''}`
                    : '✗ Not included'}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Listed Price</div>
                <div style={valueStyle}>
                  ₹{Number(software.price || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  {software.purchaseType?.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            {/* Why auction */}
            {auction.auctionRationale && (
              <div style={{ marginBottom: '1rem', padding: '0.875rem',
                            background: '#f9fafb', borderRadius: 8,
                            border: '1px solid #e5e7eb' }}>
                <div style={labelStyle}>Seller's Rationale</div>
                <p style={{ fontSize: '0.85rem', color: '#374151',
                            margin: '0.25rem 0 0', lineHeight: 1.6 }}>
                  {auction.auctionRationale}
                </p>
              </div>
            )}

            {/* Transfer details */}
            {auction.transferDetails && (
              <div style={{ marginBottom: '1rem', padding: '0.875rem',
                            background: '#f9fafb', borderRadius: 8,
                            border: '1px solid #e5e7eb' }}>
                <div style={labelStyle}>Transfer / IP Details</div>
                <p style={{ fontSize: '0.85rem', color: '#374151',
                            margin: '0.25rem 0 0', lineHeight: 1.6 }}>
                  {auction.transferDetails}
                </p>
              </div>
            )}

            {/* Rejection reason if rejected */}
            {auction.approvalStatus === 'REJECTED' && auction.rejectionReason && (
              <div style={{ marginBottom: '1rem', padding: '0.875rem',
                            background: 'rgba(200,110,110,0.07)',
                            border: '1px solid rgba(200,110,110,0.25)', borderRadius: 8 }}>
                <div style={{ ...labelStyle, color: '#c86e6e' }}>Rejection Reason</div>
                <p style={{ fontSize: '0.85rem', color: '#c86e6e',
                            margin: '0.25rem 0 0' }}>
                  {auction.rejectionReason}
                </p>
                {auction.reviewedAt && (
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                    Reviewed: {formatAuctionDateTime(auction.reviewedAt)}
                  </div>
                )}
              </div>
            )}

            {/* Bids (when active/ended) */}
            {bids?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={labelStyle}>All Bids ({bids.length})</div>
                <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: '0.5rem',
                              background: '#f9fafb', borderRadius: 8, padding: '0.5rem',
                              border: '1px solid #e5e7eb' }}>
                  {bids.map((bid, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                          padding: '0.4rem 0.5rem', fontSize: '0.8rem',
                                          borderBottom: i < bids.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      <span style={{ color: '#111827', fontWeight: 500 }}>{bid.bidderName}</span>
                      <span style={{ color: bid.isWinningBid ? '#059669' : '#7c3aed', fontWeight: 600 }}>
                        ₹{Number(bid.amount).toLocaleString('en-IN')}
                        {bid.isWinningBid && ' 🏆'}
                      </span>
                      <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {formatAuctionDateTime(bid.bidTime, {
                          hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                        }, '')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin action buttons */}
            {isPending && (
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem',
                            borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  style={{ padding: '0.5rem 1.25rem', background: '#6ec896',
                           color: '#fff', border: 'none', borderRadius: 8,
                           fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                           opacity: loading ? 0.6 : 1 }}>
                  {loading ? '…' : '✓ Approve & Go Live'}
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={loading}
                  style={{ padding: '0.5rem 1.25rem', background: 'transparent',
                           color: '#c86e6e', border: '1px solid rgba(200,110,110,0.4)',
                           borderRadius: 8, fontWeight: 700, fontSize: '0.88rem',
                           cursor: 'pointer' }}>
                  ✗ Reject
                </button>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', alignSelf: 'center' }}>
                  Submitted: {formatAuctionDate(auction.createdAt, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  }, '—')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {rejectModal && (
        <RejectModal
          softwareName={software.name}
          auctionId={auction.id}
          onClose={() => setRejectModal(false)}
          onRejected={() => { setRejectModal(false); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({ softwareName, auctionId, onClose, onRejected }) {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { alert('Please provide a rejection reason'); return; }
    setLoading(true);
    try {
      await softwareAuctionAPI.adminReject(auctionId, reason.trim());
      onRejected();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-glow" />
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <div className="modal-badge" style={{ background: 'rgba(200,110,110,0.15)',
                                                color: '#c86e6e',
                                                border: '1px solid rgba(200,110,110,0.3)' }}>
            Reject Auction
          </div>
          <h2>Reject "{softwareName}"?</h2>
          <p>The lister will be notified with your reason. They can revise and resubmit.</p>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.5rem',
                          display: 'block' }}>
            Rejection Reason <span style={{ color: '#c86e6e' }}>*</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Minimum bid price is too low for this type of software, listing quality needs improvement…"
            rows={3} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            style={{ flex: 1, padding: '0.6rem 1rem',
                     background: loading || !reason.trim() ? '#e5e7eb' : '#c86e6e',
                     color: loading || !reason.trim() ? '#9ca3af' : '#fff',
                     border: 'none', borderRadius: 8, fontWeight: 700,
                     fontSize: '0.88rem', cursor: loading || !reason.trim() ? 'not-allowed' : 'pointer' }}>
            {loading ? '…' : 'Confirm Rejection'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}