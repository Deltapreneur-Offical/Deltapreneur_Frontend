import { useState, useEffect, useCallback } from 'react';
import { franchiseApplicationAPI } from '../../api/services';

const STATUS_OPTIONS = ['PENDING', 'REVIEWED', 'IN_PROGRESS', 'APPROVED', 'REJECTED'];
const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  REVIEWED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
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
    } catch { toast?.error?.('Failed to load'); }
    finally { setLoading(false); }
  }, [statusFilter, search, showBlacklisted, toast]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id, s) => {
    try { await franchiseApplicationAPI.adminUpdateStatus(id, { status: s }); toast?.success?.('Updated'); load(); }
    catch { toast?.error?.('Failed'); }
  };

  const doBlacklist = async () => {
    if (!blReason.trim()) return;
    try { await franchiseApplicationAPI.adminBlacklist(blModal.id, { reason: blReason }); toast?.success?.('Blacklisted'); setBlModal(null); setBlReason(''); load(); }
    catch { toast?.error?.('Failed'); }
  };

  const doDelete = async () => {
    try { await franchiseApplicationAPI.adminDelete(delConfirm.id); toast?.success?.('Deleted'); setDelConfirm(null); load(); }
    catch { toast?.error?.('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">HubRegistrar Franchise Applications</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="text" placeholder="Search name, mobile, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-64" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={showBlacklisted} onChange={(e) => setShowBlacklisted(e.target.checked)} /> Blacklisted</label>
        </div>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr>
            {["S.No","Name","Mobile","Email","City","State","Business","Location","Date","Status","Actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={11} className="text-center py-8 text-gray-500">Loading...</td></tr>
            : apps.length === 0 ? <tr><td colSpan={11} className="text-center py-8 text-gray-500">No applications found</td></tr>
            : apps.map((a, i) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{String(i+1).padStart(2,"0")}</td>
                <td className="px-3 py-2 font-medium">{a.full_name}</td>
                <td className="px-3 py-2">{a.mobile_number}</td>
                <td className="px-3 py-2">{a.email}</td>
                <td className="px-3 py-2">{a.city}</td>
                <td className="px-3 py-2">{a.state}</td>
                <td className="px-3 py-2">{a.existing_business_name || "—"}</td>
                <td className="px-3 py-2">{a.preferred_location || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2">
                  {a.is_blacklisted ? <span className="px-2 py-1 rounded-full text-xs font-semibold bg-black text-white">BLACKLISTED</span>
                  : <select value={a.status} onChange={(e) => changeStatus(a.id, e.target.value)} className="px-2 py-1 rounded-full text-xs font-semibold border-0" style={{background: {PENDING:"#fef9c3",REVIEWED:"#dbeafe",IN_PROGRESS:"#e0e7ff",APPROVED:"#dcfce7",REJECTED:"#fee2e2"}[a.status] || "#f3f4f6"}}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                    </select>}
                </td>
                <td className="px-3 py-2"><div className="flex items-center gap-1">
                  <button onClick={() => setViewApp(a)} className="text-blue-600 hover:text-blue-800 text-xs">View</button>
                  {!a.is_blacklisted && <button onClick={() => setBlModal(a)} className="text-orange-600 hover:text-orange-800 text-xs">Blacklist</button>}
                  <button onClick={() => setDelConfirm(a)} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewApp(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Application Details</h3><button onClick={() => setViewApp(null)} className="text-gray-500 text-xl">&times;</button></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {["Full Name","Mobile","Email","City","State","Full Address","Business Name","Business Type","Preferred Location","Office Availability","Status"].map((l, i) => {
                const v = [viewApp.full_name, viewApp.mobile_number, viewApp.email, viewApp.city, viewApp.state, viewApp.full_address, viewApp.existing_business_name, viewApp.business_type, viewApp.preferred_location, viewApp.existing_office_availability, viewApp.status][i];
                return <div key={l} className={l==="Full Address"?"col-span-2":""}><span className="font-medium text-gray-600">{l}:</span><p className="mt-0.5">{v || "—"}</p></div>;
              })}
              {["Experience","Reason","Additional Info"].map((l, i) => {
                const v = [viewApp.relevant_experience, viewApp.reason_for_applying, viewApp.additional_information][i];
                return <div key={l} className="col-span-2"><span className="font-medium text-gray-600">{l}:</span><p className="mt-0.5 whitespace-pre-wrap">{v || "—"}</p></div>;
              })}
            </div>
          </div>
        </div>
      )}

      {delConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDelConfirm(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-4">Permanently delete application from <strong>{delConfirm.full_name}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelConfirm(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={doDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {blModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setBlModal(null); setBlReason(""); }}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-orange-600 mb-2">Blacklist Applicant</h3>
            <p className="text-sm text-gray-600 mb-3">Blacklist <strong>{blModal.full_name}</strong>? They cannot submit future applications.</p>
            <textarea value={blReason} onChange={(e) => setBlReason(e.target.value)} placeholder="Reason..." className="w-full border rounded-lg px-3 py-2 text-sm mb-4" rows={3} />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setBlModal(null); setBlReason(""); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={doBlacklist} disabled={!blReason.trim()} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50">Blacklist</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
