import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { softwareAuctionAPI } from '../api/services';
import { formatAuctionDate, formatAuctionDateTime } from '../utils/auctionDate';
import useCurrency from '../context/CurrencyContext';

const APPROVAL_COLORS = {
  PENDING_APPROVAL: { color: '#b45309', bg: 'rgba(245,158,11,0.12)', labelKey: 'softwareAuctionAdminPendingReview' },
  APPROVED:         { color: '#059669', bg: 'rgba(5,150,105,0.1)', labelKey: 'softwareAuctionAdminApproved' },
  REJECTED:         { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', labelKey: 'softwareAuctionAdminRejected' },
};

const STATUS_COLORS = {
  DRAFT:    '#b45309',
  ACTIVE:   '#059669',
  EXTENDED: '#d97706',
  ENDED:    '#0369a1',
  UNSOLD:   '#6b7280',
  CLOSED:   '#4b5563',
};

// ─── Main tab component ───────────────────────────────────────────────────────
export default function SoftwareAuctionAdminTab({ auctions, onRefresh }) {
  const { t } = useTranslation();
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
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{t('softwareAuctionAdminEmptyTitle')}</h3>
      <p className="text-gray-600">{t('softwareAuctionAdminEmptyDesc')}</p>
    </div>
  );

  return (
    <div>
      {/* Sub-filter */}
      <div className="filter-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'PENDING_APPROVAL', label: t('softwareAuctionAdminFilterPending', { count: pendingCount }) },
          { id: 'APPROVED',         label: t('softwareAuctionAdminFilterApproved') },
          { id: 'REJECTED',         label: t('softwareAuctionAdminFilterRejected') },
          { id: 'ALL',              label: t('softwareAuctionAdminFilterAll', { count: auctions.length }) },
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
        <div className="text-center py-16 text-gray-400 text-sm">{t('softwareAuctionAdminNoMatches')}</div>
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
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded]       = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [loading, setLoading]         = useState(false);

  const approval = APPROVAL_COLORS[auction.approvalStatus] || APPROVAL_COLORS.PENDING_APPROVAL;
  const isPending = auction.approvalStatus === 'PENDING_APPROVAL';

  const handleApprove = async () => {
    if (!confirm(t('softwareAuctionAdminApproveConfirm', { name: software.name }))) return;
    setLoading(true);
    try {
      await softwareAuctionAPI.adminApprove(auction.id);
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.error || t('softwareAuctionAdminApproveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`admin-record-card ${isPending ? 'admin-record-card--pending' : ''}`}>

        {/* Row header */}
        <div className="admin-record-row" onClick={() => setExpanded(v => !v)}>

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
            <div className="admin-record-title" style={{ fontSize: '0.95rem' }}>
              {software.name || t('softwareAuctionAdminUnnamed')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem',
                          display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span>{t('softwareAuctionAdminMin')} {formatPrice(auction.minBidPrice || 0)}</span>
              <span>·</span>
              <span>{auction.duration?.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>{t('softwareAuctionAdminBids', { count: auction.totalBids || 0 })}</span>
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
              {t(approval.labelKey)}
            </span>
            {/* Auction status badge (shown once approved) */}
            {auction.approvalStatus === 'APPROVED' && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700,
                             color: STATUS_COLORS[auction.status] || '#6b7280',
                             background: (STATUS_COLORS[auction.status] || '#6b7280') + '18',
                             border: `1px solid ${(STATUS_COLORS[auction.status] || '#6b7280')}33`,
                             padding: '0.2rem 0.6rem', borderRadius: 4 }}>
                {auction.status}
              </span>
            )}
            <span className="admin-expand-chevron" style={{ marginLeft: '0.25rem' }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="admin-record-body" style={{ padding: '1.25rem' }}>

            {/* Key details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                          gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div className="admin-field-label">{t('softwareAuctionAdminListedBy')}</div>
                <div className="admin-field-value">
                  {software.listedBy?.firstname} {software.listedBy?.lastname}
                </div>
                <div className="admin-field-meta">{software.listedBy?.email}</div>
              </div>
              <div>
                <div className="admin-field-label">{t('softwareAuctionAdminCurrentHighestBid')}</div>
                <div className={`admin-price-amount admin-price-amount--lg ${
                  auction.currentHighestBid > 0 ? 'admin-price-amount--bid' : 'admin-price-amount--empty'
                }`}>
                  {auction.currentHighestBid > 0
                    ? formatPrice(auction.currentHighestBid)
                    : '—'}
                </div>
                {auction.currentWinner && (
                  <div className="admin-field-meta">
                    {auction.currentWinner.firstname} {auction.currentWinner.lastname}
                  </div>
                )}
              </div>
              <div>
                <div className="admin-field-label">{t('softwareAuctionAdminTimeline')}</div>
                <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                  {auction.startTime
                    ? t('softwareAuctionAdminStarted', { date: formatAuctionDate(auction.startTime) })
                    : t('softwareAuctionAdminNotStarted')}
                </div>
                {auction.endTime && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    {t('softwareAuctionAdminEnds', { date: formatAuctionDateTime(auction.endTime, {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    }) })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                          gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div className="admin-field-label">{t('softwareAuctionAdminSourceCode')}</div>
                <div style={{ fontSize: '0.85rem',
                              color: auction.sourceCodeIncluded ? '#6ec896' : '#9ca3af' }}>
                  {auction.sourceCodeIncluded ? t('softwareAuctionAdminIncluded') : t('softwareAuctionAdminNotIncluded')}
                </div>
              </div>
              <div>
                <div className="admin-field-label">{t('softwareAuctionAdminPostSaleSupport')}</div>
                <div style={{ fontSize: '0.85rem',
                              color: auction.supportIncluded ? '#6ec896' : '#9ca3af' }}>
                  {auction.supportIncluded
                    ? t('softwareAuctionAdminSupportDays', { count: auction.supportDays })
                    : t('softwareAuctionAdminNotIncluded')}
                </div>
              </div>
              <div>
                <div className="admin-field-label">{t('softwareAuctionAdminListedPrice')}</div>
                <div className="admin-field-value">
                  {formatPrice(software.price || 0)}
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
                <div className="admin-field-label">{t('softwareAuctionAdminRationale')}</div>
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
                <div className="admin-field-label">{t('softwareAuctionAdminTransferDetails')}</div>
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
                <div className="admin-field-label" style={{ color: '#dc2626' }}>{t('softwareAuctionAdminRejectionReason')}</div>
                <p className="admin-error-note" style={{ margin: '0.25rem 0 0', fontStyle: 'normal' }}>
                  {auction.rejectionReason}
                </p>
                {auction.reviewedAt && (
                  <div className="admin-field-meta" style={{ marginTop: '0.4rem', fontSize: '0.72rem' }}>
                    {t('softwareAuctionAdminReviewed', { date: formatAuctionDateTime(auction.reviewedAt) })}
                  </div>
                )}
              </div>
            )}

            {/* Bids (when active/ended) */}
            {bids?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="admin-field-label">{t('softwareAuctionAdminAllBids', { count: bids.length })}</div>
                <div className="admin-bids-panel">
                  {bids.map((bid, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                          padding: '0.4rem 0.5rem', fontSize: '0.8rem',
                                          borderBottom: i < bids.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      <span style={{ color: '#111827', fontWeight: 500 }}>{bid.bidderName}</span>
                      <span style={{ color: bid.isWinningBid ? '#059669' : '#7c3aed', fontWeight: 600 }}>
                        {formatPrice(bid.amount)}
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
                  {loading ? '…' : t('softwareAuctionAdminApproveGoLive')}
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={loading}
                  style={{ padding: '0.5rem 1.25rem', background: 'transparent',
                           color: '#c86e6e', border: '1px solid rgba(200,110,110,0.4)',
                           borderRadius: 8, fontWeight: 700, fontSize: '0.88rem',
                           cursor: 'pointer' }}>
                  {t('softwareAuctionAdminReject')}
                </button>
                <div style={{ flex: 1 }} />
                <div className="admin-field-meta" style={{ alignSelf: 'center' }}>
                  {t('softwareAuctionAdminSubmitted', { date: formatAuctionDate(auction.createdAt, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  }) || '—' })}
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
  const { t } = useTranslation();
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { alert(t('softwareAuctionAdminRejectReasonRequired')); return; }
    setLoading(true);
    try {
      await softwareAuctionAPI.adminReject(auctionId, reason.trim());
      onRejected();
    } catch (e) {
      alert(e.response?.data?.error || t('softwareAuctionAdminRejectFailed'));
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
            {t('softwareAuctionAdminRejectModalBadge')}
          </div>
          <h2>{t('softwareAuctionAdminRejectTitle', { name: softwareName })}</h2>
          <p>{t('softwareAuctionAdminRejectDesc')}</p>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="admin-form-label">
            {t('softwareAuctionAdminRejectReason')} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder={t('softwareAuctionAdminRejectPlaceholder')}
            rows={3} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            style={{ flex: 1, padding: '0.6rem 1rem',
                     background: loading || !reason.trim() ? '#e5e7eb' : '#c86e6e',
                     color: loading || !reason.trim() ? '#6b7280' : '#fff',
                     border: 'none', borderRadius: 8, fontWeight: 700,
                     fontSize: '0.88rem', cursor: loading || !reason.trim() ? 'not-allowed' : 'pointer' }}>
            {loading ? '…' : t('softwareAuctionAdminConfirmRejection')}
          </button>
          <button className="btn-ghost" onClick={onClose}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}