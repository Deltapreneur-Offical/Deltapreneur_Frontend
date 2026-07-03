import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { softwareAuctionAPI, adminAPI } from '../api/services';
import { formatAuctionDate, formatAuctionDateTime } from '../utils/auctionDate';
import useCurrency from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import SoftwareAuctionTakeDownTab from './SoftwareAuctionTakeDownTab';

const APPROVAL_COLORS = {
  PENDING_APPROVAL: { color: '#b45309', bg: 'rgba(245,158,11,0.12)', labelKey: 'softwareAuctionAdminPendingReview' },
  APPROVED:         { color: '#059669', bg: 'rgba(5,150,105,0.1)', labelKey: 'softwareAuctionAdminApproved' },
  REJECTED:         { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', labelKey: 'softwareAuctionAdminRejected' },
};

const STATUS_COLORS = {
  DRAFT:      '#b45309',
  ACTIVE:     '#059669',
  EXTENDED:   '#d97706',
  ENDED:      '#0369a1',
  UNSOLD:     '#6b7280',
  CLOSED:     '#4b5563',
  TAKEN_DOWN: '#dc2626',
};

// ─── Main tab component ───────────────────────────────────────────────────────
export default function SoftwareAuctionAdminTab({ auctions: initialAuctions, onRefresh }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('ALL');
  const [localAuctions, setLocalAuctions] = useState(initialAuctions);

  useEffect(() => {
    setLocalAuctions(initialAuctions);
  }, [initialAuctions]);

  const updateAuctionLocally = (id, changes) => {
    setLocalAuctions(prev => prev.map(item => {
      const a = item.auction ?? item;
      if (a.id === id) {
        if (item.auction) {
          return { ...item, auction: { ...a, ...changes } };
        } else {
          return { ...item, ...changes };
        }
      }
      return item;
    }));
  };

  const filtered = filter === 'ALL'
    ? localAuctions
    : localAuctions.filter(item => {
        const a = item.auction ?? item;
        return a.approvalStatus === filter;
      });

  const pendingCount = localAuctions.filter(item =>
    (item.auction ?? item).approvalStatus === 'PENDING_APPROVAL'
  ).length;

  const approvedCount = localAuctions.filter(item =>
    (item.auction ?? item).approvalStatus === 'APPROVED'
  ).length;

  const rejectedCount = localAuctions.filter(item =>
    (item.auction ?? item).approvalStatus === 'REJECTED'
  ).length;

  if (localAuctions.length === 0) return (
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
          { id: 'ALL',              label: t('softwareAuctionAdminFilterAll', { count: localAuctions.length }) },
          { id: 'PENDING_APPROVAL', label: t('softwareAuctionAdminFilterPending', { count: pendingCount }) },
          { id: 'APPROVED',         label: `Approved (${approvedCount})` },
          { id: 'REJECTED',         label: `Rejected (${rejectedCount})` },
          { id: 'TAKEDOWNS',        label: 'Tech Takedowns' },
        ].map(f => (
          <button key={f.id}
            className={`filter-tab ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
            style={{ fontSize: '0.82rem' }}>
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'TAKEDOWNS' ? (
        <SoftwareAuctionTakeDownTab />
      ) : filtered.length === 0 ? (
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
                updateAuctionLocally={updateAuctionLocally}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Individual row ───────────────────────────────────────────────────────────
function SoftwareAuctionAdminRow({ auction, bids, software, onRefresh, updateAuctionLocally }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded]       = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [takeDownModal, setTakeDownModal] = useState(false);
  const [approveAgainModal, setApproveAgainModal] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [imgError, setImgError]       = useState(false);

  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  const isModeratorOrSuperAdmin = ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'AUCTION_MODERATOR', 'ROLE_AUCTION_MODERATOR'].includes(roleUpper);

  const approval = APPROVAL_COLORS[auction.approvalStatus] || APPROVAL_COLORS.PENDING_APPROVAL;
  const isPending = auction.approvalStatus === 'PENDING_APPROVAL';
  const canTakeDown = auction.approvalStatus === 'APPROVED' || auction.status === 'ACTIVE';
  const isRejected = auction.approvalStatus === 'REJECTED';

  const handleApprove = async () => {
    if (!window.confirm(t('softwareAuctionAdminApproveConfirm', { name: software.name }))) return;
    setLoading(true);
    try {
      await softwareAuctionAPI.adminApprove(auction.id);
      updateAuctionLocally(auction.id, { approvalStatus: 'APPROVED', status: 'ACTIVE' });
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.error || t('softwareAuctionAdminApproveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAgainConfirm = async () => {
    setLoading(true);
    setApproveAgainModal(false);
    try {
      await adminAPI.approveAgainSoftwareAuction(auction.id);
      updateAuctionLocally(auction.id, { 
        approvalStatus: 'APPROVED', 
        status: 'ACTIVE',
        rejectionReason: null 
      });
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to approve auction again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`admin-record-card ${isPending ? 'admin-record-card--pending' : ''}`}>

        {/* Row header */}
        <div className="admin-record-row" onClick={() => setExpanded(v => !v)}>

          {/* Software image with fallback */}
          {software.imageUrl && !imgError ? (
            <img src={software.imageUrl} alt={software.name}
              onError={() => setImgError(true)}
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover',
                       border: '1px solid #e5e7eb', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3f4f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem', flexShrink: 0, color: '#9ca3af' }}>⌥</div>
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
            <span 
              title={`Updated at ${formatAuctionDateTime(auction.updatedAt || auction.createdAt)}`}
              style={{ fontSize: '0.72rem', fontWeight: 700,
                           color: approval.color, background: approval.bg,
                           border: `1px solid ${approval.color}44`,
                           padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'help' }}>
              {t(approval.labelKey)}
            </span>
            {/* Auction status badge (shown once approved) */}
            {auction.approvalStatus === 'APPROVED' && (
              <span 
                title={`Status: ${auction.status}`}
                style={{ fontSize: '0.72rem', fontWeight: 700,
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

            {/* Rejection / Takedown details */}
            {isRejected && (auction.rejectionReason || auction.takeDownReason) && (
              <div style={{ marginBottom: '1rem', padding: '0.875rem',
                            background: 'rgba(220,38,38,0.05)',
                            border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8 }}>
                <div className="admin-field-label" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  {auction.status === 'TAKEN_DOWN' ? 'Taken Down by Admin' : 'Rejected'}
                </div>
                <p className="admin-error-note" style={{ margin: '0.25rem 0 0', fontStyle: 'normal', color: '#7f1d1d', fontWeight: 500 }}>
                  Reason: {auction.rejectionReason || auction.takeDownReason}
                </p>
                {auction.takeDownDescription && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#991b1b' }}>
                    Details: {auction.takeDownDescription}
                  </p>
                )}
                {auction.takenDownBy && (
                  <div className="admin-field-meta" style={{ marginTop: '0.4rem', fontSize: '0.72rem' }}>
                    Moderator: {auction.takenDownBy.firstname} {auction.takenDownBy.lastname} ({auction.takenDownBy.email})
                  </div>
                )}
                {auction.takenDownAt && (
                  <div className="admin-field-meta" style={{ marginTop: '0.1rem', fontSize: '0.72rem' }}>
                    Timestamp: {formatAuctionDateTime(auction.takenDownAt)}
                  </div>
                )}
                {!auction.takenDownAt && auction.reviewedAt && (
                  <div className="admin-field-meta" style={{ marginTop: '0.1rem', fontSize: '0.72rem' }}>
                    Timestamp: {formatAuctionDateTime(auction.reviewedAt)}
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
            {isModeratorOrSuperAdmin && (
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem',
                            borderTop: '1px solid #e5e7eb', alignItems: 'center' }}>
                
                {isPending && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={loading}
                      style={{ padding: '0.5rem 1.25rem', background: '#059669',
                               color: '#fff', border: 'none', borderRadius: 8,
                               fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                               opacity: loading ? 0.6 : 1, transition: '0.2s' }}>
                      {loading ? '…' : t('softwareAuctionAdminApproveGoLive')}
                    </button>
                    <button
                      onClick={() => setRejectModal(true)}
                      disabled={loading}
                      style={{ padding: '0.5rem 1.25rem', background: 'transparent',
                               color: '#dc2626', border: '1px solid rgba(220,38,38,0.4)',
                               borderRadius: 8, fontWeight: 700, fontSize: '0.88rem',
                               cursor: 'pointer', transition: '0.2s' }}>
                      {t('softwareAuctionAdminReject')}
                    </button>
                  </>
                )}

                {canTakeDown && (
                  <button
                    onClick={() => setTakeDownModal(true)}
                    disabled={loading}
                    style={{ padding: '0.5rem 1.25rem', background: '#fef2f2',
                             color: '#dc2626', border: '1px solid #fecaca',
                             borderRadius: 8, fontWeight: 700, fontSize: '0.88rem',
                             cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: '0.2s' }}>
                    <span>🛑</span> Take Down Auction
                  </button>
                )}

                {isRejected && (
                  <button
                    onClick={() => setApproveAgainModal(true)}
                    disabled={loading}
                    style={{ padding: '0.5rem 1.25rem', background: '#4338ca',
                             color: '#fff', border: 'none', borderRadius: 8,
                             fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                             opacity: loading ? 0.6 : 1, transition: '0.2s' }}>
                    {loading ? '…' : '✅ Approve Again'}
                  </button>
                )}

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
          onRejected={(reason) => { 
            setRejectModal(false);
            updateAuctionLocally(auction.id, { approvalStatus: 'REJECTED', rejectionReason: reason, reviewedAt: new Date().toISOString() });
            onRefresh(); 
          }}
        />
      )}

      {takeDownModal && (
        <TakeDownModal
          softwareName={software.name}
          auctionId={auction.id}
          onClose={() => setTakeDownModal(false)}
          onTakeDown={(reason, desc) => { 
            setTakeDownModal(false);
            updateAuctionLocally(auction.id, { 
              approvalStatus: 'REJECTED', 
              status: 'TAKEN_DOWN', 
              rejectionReason: reason, 
              takeDownDescription: desc,
              takenDownAt: new Date().toISOString(),
              takenDownBy: {
                firstname: user?.firstname || 'Admin',
                lastname: user?.lastname || '',
                email: user?.email || ''
              }
            });
            onRefresh(); 
          }}
        />
      )}

      {approveAgainModal && (
        <ApproveAgainModal
          softwareName={software.name}
          onClose={() => setApproveAgainModal(false)}
          onConfirm={handleApproveAgainConfirm}
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
      onRejected(reason.trim());
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
          <div className="modal-badge" style={{ background: 'rgba(220,38,38,0.1)',
                                                color: '#dc2626',
                                                border: '1px solid rgba(220,38,38,0.2)' }}>
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
            rows={3} style={{ resize: 'vertical', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            style={{ flex: 1, padding: '0.6rem 1rem',
                     background: loading || !reason.trim() ? '#e5e7eb' : '#dc2626',
                     color: loading || !reason.trim() ? '#9ca3af' : '#fff',
                     border: 'none', borderRadius: 8, fontWeight: 700,
                     fontSize: '0.88rem', cursor: loading || !reason.trim() ? 'not-allowed' : 'pointer', transition: '0.2s' }}>
            {loading ? '…' : t('softwareAuctionAdminConfirmRejection')}
          </button>
          <button className="btn-ghost" onClick={onClose}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Take Down modal ──────────────────────────────────────────────────────────
function TakeDownModal({ softwareName, auctionId, onClose, onTakeDown }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { alert('Reason is required'); return; }
    setLoading(true);
    try {
      await adminAPI.takeDownSoftwareAuction(auctionId, reason.trim(), description.trim());
      onTakeDown(reason.trim(), description.trim());
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to take down auction');
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
          <div className="modal-badge" style={{ background: 'rgba(220,38,38,0.1)',
                                                color: '#dc2626',
                                                border: '1px solid rgba(220,38,38,0.2)' }}>
            ⚠️ Danger
          </div>
          <h2>Take Down Auction</h2>
          <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            This auction will immediately disappear from the marketplace.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Are you sure you want to take down the auction for <strong>{softwareName}</strong>?
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="admin-form-label">
            Reason <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select value={reason} onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', color: '#111827', background: '#fff' }}>
            <option value="">Select a reason...</option>
            <option value="Scam">Scam</option>
            <option value="Fraud">Fraud</option>
            <option value="Malware">Malware</option>
            <option value="Copyright">Copyright</option>
            <option value="Fake Listing">Fake Listing</option>
            <option value="Duplicate">Duplicate</option>
            <option value="Seller Request">Seller Request</option>
            <option value="Policy Violation">Policy Violation</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {reason === 'Other' && (
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="admin-form-label">
              Additional Details <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Explain the specific violation..."
              rows={3} style={{ resize: 'vertical', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim() || (reason === 'Other' && !description.trim())}
            style={{ flex: 1, padding: '0.6rem 1rem',
                     background: loading || !reason.trim() || (reason === 'Other' && !description.trim()) ? '#e5e7eb' : '#dc2626',
                     color: loading || !reason.trim() || (reason === 'Other' && !description.trim()) ? '#9ca3af' : '#fff',
                     border: 'none', borderRadius: 8, fontWeight: 700,
                     fontSize: '0.88rem', cursor: loading || !reason.trim() || (reason === 'Other' && !description.trim()) ? 'not-allowed' : 'pointer', transition: '0.2s' }}>
            {loading ? '…' : 'Take Down'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Approve Again confirmation modal ──────────────────────────────────────────
function ApproveAgainModal({ softwareName, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-glow" />
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <div className="modal-badge" style={{ background: 'rgba(5,150,105,0.1)',
                                                color: '#059669',
                                                border: '1px solid rgba(5,150,105,0.2)' }}>
            Approve Again
          </div>
          <h2>Approve this auction again?</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginTop: '0.5rem' }}>
            It will become visible on the marketplace again under active listings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '0.6rem 1rem',
                     background: '#059669',
                     color: '#fff',
                     border: 'none', borderRadius: 8, fontWeight: 700,
                     fontSize: '0.88rem', cursor: 'pointer', transition: '0.2s' }}>
            Approve Again
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}