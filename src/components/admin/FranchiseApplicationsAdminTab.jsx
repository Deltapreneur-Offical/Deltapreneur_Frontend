import { useState, useEffect, useCallback } from 'react';
import { franchiseApplicationAPI } from '../../api/services';
import {
  Search as SearchIcon, Eye, Trash2, ShieldOff, CheckCircle,
  AlertTriangle, ChevronDown, X, Users, MapPin, ExternalLink,
} from 'lucide-react';

const STATUS_OPTIONS = ['PENDING', 'REVIEWED', 'IN_PROGRESS', 'APPROVED', 'REJECTED'];

const STATUS_CONFIG = {
  PENDING:     { label: 'Pending',     color: '#f59e0b', bg: '#fffbeb',  border: '#fde68a' },
  REVIEWED:    { label: 'Reviewed',    color: '#3b82f6', bg: '#eff6ff',  border: '#bfdbfe' },
  IN_PROGRESS: { label: 'In Progress', color: '#6366f1', bg: '#eef2ff',  border: '#c7d2fe' },
  APPROVED:    { label: 'Approved',    color: '#10b981', bg: '#ecfdf5',  border: '#a7f3d0' },
  REJECTED:    { label: 'Rejected',    color: '#ef4444', bg: '#fef2f2',  border: '#fecaca' },
};

export default function FranchiseApplicationsAdminTab({ toast }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showBlacklisted, setShowBlacklisted] = useState(false);
  const [viewApp, setViewApp] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [blModal, setBlModal] = useState(null);
  const [blReason, setBlReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = {};
      if (statusFilter) p.status_filter = statusFilter;
      if (search) p.search = search;
      if (showBlacklisted) p.blacklisted = true;
      const { data } = await franchiseApplicationAPI.adminList(p);
      if (data?.success) setApps(data.data || []);
    } catch { toast?.error?.('Failed to load franchise applications'); }
    finally { setLoading(false); }
  }, [statusFilter, search, showBlacklisted, toast]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id, s) => {
    try {
      await franchiseApplicationAPI.adminUpdateStatus(id, { status: s });
      toast?.success?.('Status updated');
      load();
    } catch { toast?.error?.('Failed to update status'); }
  };

  const doBlacklist = async () => {
    if (!blReason.trim()) return;
    try {
      await franchiseApplicationAPI.adminBlacklist(blModal.id, { reason: blReason });
      toast?.success?.('Applicant blacklisted');
      setBlModal(null); setBlReason(''); load();
    } catch { toast?.error?.('Failed to blacklist'); }
  };

  const doDelete = async () => {
    try {
      await franchiseApplicationAPI.adminDelete(delConfirm.id);
      toast?.success?.('Application deleted');
      setDelConfirm(null); load();
    } catch { toast?.error?.('Failed to delete'); }
  };

  const fmt = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fa-tab">
      {/* Header */}
      <div className="fa-header">
        <div className="fa-header-left">
          <span className="fa-header-icon"><Users size={20} /></span>
          <div>
            <h3 className="fa-header-title">Franchise Applications</h3>
            <p className="fa-header-sub">Review and manage incoming franchise applications</p>
          </div>
        </div>
        <span className="fa-header-count">{apps.length} application{apps.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Toolbar */}
      <div className="fa-toolbar">
        <div className="fa-search-wrap">
          <SearchIcon size={15} className="fa-search-icon" />
          <input type="text" placeholder="Search name, mobile, email..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="fa-search" />
          {search && <button className="fa-search-x" onClick={() => setSearch("")}><X size={14} /></button>}
        </div>
        <div className="fa-select-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="fa-select">
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
          </select>
          <ChevronDown size={14} className="fa-select-chevron" />
        </div>
        <label className="fa-toggle-label">
          <input type="checkbox" checked={showBlacklisted}
            onChange={(e) => setShowBlacklisted(e.target.checked)} className="fa-toggle-input" />
          <span className="fa-toggle-track"><span className="fa-toggle-thumb" /></span>
          <span className="fa-toggle-text"><ShieldOff size={13} /> Blacklisted</span>
        </label>
      </div>

      {/* Table */}
      <div className="fa-table-wrap">
        <table className="fa-table">
          <thead>
            <tr>
              <th className="fa-th-sn">S.No</th>
              <th>Applicant Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>City</th>
              <th>State</th>
              <th>Business</th>
              <th>Location</th>
              <th>Date</th>
              <th>Status</th>
              <th className="fa-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="fa-empty">
                <div className="fa-spinner-wrap"><div className="fa-spinner" /><span>Loading applications...</span></div>
              </td></tr>
            ) : apps.length === 0 ? (
              <tr><td colSpan={11} className="fa-empty">
                <div className="fa-empty-state"><Users size={32} strokeWidth={1.1} /><p>No franchise applications found</p></div>
              </td></tr>
            ) : apps.map((a, i) => {
              const bl = a.is_blacklisted;
              const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.PENDING;
              return (
                <tr key={a.id} className={bl ? "fa-row-bl" : ""}>
                  <td className="fa-serial">{String(i + 1).padStart(2, "0")}</td>
                  <td className="fa-name-td">
                    <span className="fa-name">{a.full_name}</span>
                    {bl && <span className="fa-bl-badge"><ShieldOff size={9} /> BLACKLISTED</span>}
                  </td>
                  <td>{a.mobile_number || "—"}</td>
                  <td className="fa-email-td">{a.email || "—"}</td>
                  <td>{a.city || "—"}</td>
                  <td>{a.state || "—"}</td>
                  <td className="fa-biz-td">{a.existing_business_name || "—"}</td>
                  <td>
                    {a.map_url ? (
                      <a href={a.map_url} target="_blank" rel="noopener noreferrer" className="fa-map-link-inline" title="Open in Google Maps">
                        <MapPin size={12} /> View Map
                      </a>
                    ) : a.preferred_location || "—"}
                  </td>
                  <td className="fa-date-td">{fmt(a.created_at)}</td>
                  <td>
                    {bl ? (
                      <span className="fa-badge fa-badge--bl"><ShieldOff size={10} /> BLACKLISTED</span>
                    ) : (
                      <select value={a.status} onChange={(e) => changeStatus(a.id, e.target.value)}
                        className="fa-status-sel"
                        style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    <div className="fa-actions">
                      <button onClick={() => setViewApp(a)} className="fa-btn fa-btn--view" title="View">
                        <Eye size={14} />
                      </button>
                      {!bl && <button onClick={() => setBlModal(a)} className="fa-btn fa-btn--bl" title="Blacklist">
                        <ShieldOff size={14} />
                      </button>}
                      <button onClick={() => setDelConfirm(a)} className="fa-btn fa-btn--del" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewApp && (
        <div className="fa-overlay" onClick={() => setViewApp(null)}>
          <div className="fa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fa-modal-head">
              <div>
                <h3 className="fa-modal-title">Application Details</h3>
                <p className="fa-modal-sub">{viewApp.full_name} &middot; {viewApp.email}</p>
              </div>
              <button onClick={() => setViewApp(null)} className="fa-modal-x"><X size={18} /></button>
            </div>
            <div className="fa-modal-body">
              <div className="fa-detail-grid">
                {[
                  ["Full Name", viewApp.full_name],
                  ["Mobile", viewApp.mobile_number],
                  ["Email", viewApp.email],
                  ["City", viewApp.city],
                  ["State", viewApp.state],
                ].map(([l, v]) => (
                  <div key={l} className="fa-detail-item">
                    <span className="fa-detail-lbl">{l}</span>
                    <p className="fa-detail-val">{v || "—"}</p>
                  </div>
                ))}
                <div className="fa-detail-full">
                  <span className="fa-detail-lbl">Full Address</span>
                  <p className="fa-detail-val">{viewApp.full_address || "—"}</p>
                </div>
                {viewApp.map_url && (
                  <div className="fa-detail-full fa-detail-map">
                    <span className="fa-detail-lbl"><MapPin size={14} /> Premises Location on Map</span>
                    <div className="fa-map-card">
                      <div className="fa-map-card-header">
                        <a href={viewApp.map_url} target="_blank" rel="noopener noreferrer" className="fa-map-link">
                          <ExternalLink size={14} /> Open in Google Maps
                        </a>
                      </div>
                      <div className="fa-map-embed">
                        <iframe
                          title="Location"
                          width="100%"
                          height="280"
                          style={{ border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={(() => {
                              const url = viewApp.map_url;
                              if (url.includes('google.com/maps')) return url.replace('maps?', 'maps/embed?');
                              if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps'))
                                return 'https://maps.google.com/maps?q=' + encodeURIComponent(url) + '&z=15&output=embed';
                              if (url.includes('@') && url.includes(',')) {
                                const c = url.match(/@([\d.-]+),([\d.-]+)/);
                                if (c) return 'https://maps.google.com/maps?q=' + c[1] + ',' + c[2] + '&z=15&output=embed';
                              }
                              return 'https://maps.google.com/maps?q=' + encodeURIComponent(url) + '&z=15&output=embed';
                            })()}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {[
                  ["Business / Shop Name", viewApp.existing_business_name],
                  ["Business Type", viewApp.business_type],
                  ["Preferred Location", viewApp.preferred_location],
                  ["Office / Shop Availability", viewApp.existing_office_availability],
                ].map(([l, v]) => (
                  <div key={l} className="fa-detail-item">
                    <span className="fa-detail-lbl">{l}</span>
                    <p className="fa-detail-val">{v || "—"}</p>
                  </div>
                ))}
                {[
                  ["Relevant Experience", viewApp.relevant_experience],
                  ["Reason for Applying", viewApp.reason_for_applying],
                  ["Additional Information", viewApp.additional_information],
                ].map(([l, v]) => (
                  <div key={l} className="fa-detail-full">
                    <span className="fa-detail-lbl">{l}</span>
                    <p className="fa-detail-val fa-detail-val--pre">{v || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="fa-detail-meta">
                <span>Submitted: {fmt(viewApp.created_at)}</span>
                <span>Status: <strong>{STATUS_CONFIG[viewApp.status]?.label || viewApp.status}</strong></span>
                {viewApp.is_blacklisted && (
                  <span className="fa-detail-meta-bl">
                    <ShieldOff size={12} /> BLACKLISTED{viewApp.blacklist_reason && <> &mdash; {viewApp.blacklist_reason}</>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {delConfirm && (
        <div className="fa-overlay" onClick={() => setDelConfirm(null)}>
          <div className="fa-modal fa-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="fa-modal-head fa-modal-head--danger">
              <div>
                <h3 className="fa-modal-title"><AlertTriangle size={17} /> Confirm Delete</h3>
                <p className="fa-modal-sub">This action cannot be undone</p>
              </div>
              <button onClick={() => setDelConfirm(null)} className="fa-modal-x"><X size={18} /></button>
            </div>
            <div className="fa-modal-body">
              <p className="fa-confirm-text">Permanently delete the franchise application from <strong>{delConfirm.full_name}</strong>?</p>
            </div>
            <div className="fa-modal-foot">
              <button onClick={() => setDelConfirm(null)} className="fa-btn-action fa-btn-action--ghost">Cancel</button>
              <button onClick={doDelete} className="fa-btn-action fa-btn-action--danger"><Trash2 size={13} /> Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {blModal && (
        <div className="fa-overlay" onClick={() => { setBlModal(null); setBlReason(""); }}>
          <div className="fa-modal fa-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="fa-modal-head fa-modal-head--warning">
              <div>
                <h3 className="fa-modal-title"><ShieldOff size={17} /> Blacklist Applicant</h3>
                <p className="fa-modal-sub">They will not be able to submit future applications</p>
              </div>
              <button onClick={() => { setBlModal(null); setBlReason(""); }} className="fa-modal-x"><X size={18} /></button>
            </div>
            <div className="fa-modal-body">
              <p className="fa-confirm-text">Blacklist <strong>{blModal.full_name}</strong> ({blModal.email})?</p>
              <label className="fa-field-lbl">Reason for blacklisting</label>
              <textarea value={blReason} onChange={(e) => setBlReason(e.target.value)}
                placeholder="Enter the reason..." className="fa-textarea" rows={3} />
            </div>
            <div className="fa-modal-foot">
              <button onClick={() => { setBlModal(null); setBlReason(""); }} className="fa-btn-action fa-btn-action--ghost">Cancel</button>
              <button onClick={doBlacklist} disabled={!blReason.trim()} className="fa-btn-action fa-btn-action--warning">
                <ShieldOff size={13} /> Blacklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
