import { useEffect, useState } from 'react';
import { domainTransferAdminAPI } from '../api/domainTransferAPI';

export default function DomainTransferAdminTab() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadList = () => {
    setLoading(true);
    domainTransferAdminAPI
      .list()
      .then(({ data }) => setItems(data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
  }, []);

  const openDetail = async (id) => {
    const { data } = await domainTransferAdminAPI.get(id);
    setSelected(data);
  };

  const run = async (fn) => {
    if (!selected?.id) return;
    setBusy(true);
    try {
      await fn(selected.id);
      await openDetail(selected.id);
      loadList();
    } catch (e) {
      alert(e?.response?.data?.error || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p>Loading transfers…</p>;

  return (
    <div className="grid md:grid-cols-2 gap-4 min-w-0">
      <div className="overflow-auto max-h-[70vh] border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">Domain</th>
              <th className="p-2">Status</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.domainFqdn}</td>
                <td className="p-2">{row.transferStatus}</td>
                <td className="p-2">
                  <button type="button" className="text-indigo-600" onClick={() => openDetail(row.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border rounded-lg p-4 min-h-[200px]">
        {!selected ? (
          <p className="text-gray-500">Select a transfer</p>
        ) : (
          <>
            <h3 className="font-bold text-lg mb-2">{selected.domainFqdn}</h3>
            <p className="text-sm mb-1">Escrow: {selected.escrowStatus}</p>
            <p className="text-sm mb-1">Transfer: {selected.transferStatus}</p>
            <p className="text-sm mb-3">Seller payout: ₹{selected.sellerPayoutInr}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => run(domainTransferAdminAPI.approvePayout)}>
                Approve payout
              </button>
              <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => run(domainTransferAdminAPI.releasePayout)}>
                Release payout
              </button>
              <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => run(domainTransferAdminAPI.refund)}>
                Refund
              </button>
              <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => run(domainTransferAdminAPI.forceComplete)}>
                Force complete
              </button>
              <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => run(domainTransferAdminAPI.syncWhois)}>
                Sync WHOIS
              </button>
              {selected.transferStatus === 'ADMIN_REVIEW_REQUIRED' && (
                <>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() =>
                      run((id) =>
                        domainTransferAdminAPI.resolveAdminReview(id, {
                          action: 'extend_deadline',
                          extensionHours: 36,
                        }),
                      )
                    }
                  >
                    Extend 36h
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => run((id) => domainTransferAdminAPI.resolveAdminReview(id, { action: 'refund' }))}
                  >
                    Refund (review)
                  </button>
                </>
              )}
            </div>
            {selected.timeline?.length > 0 && (
              <ul className="mt-4 text-xs space-y-1 max-h-48 overflow-auto">
                {selected.timeline.map((ev) => (
                  <li key={ev.id}>{ev.eventType} — {ev.createdAt}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
