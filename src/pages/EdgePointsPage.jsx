import { useState, useEffect, useCallback } from 'react';
import { Award, TrendingUp, Gift, Share2, Clock, Info, ChevronRight } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import api from '../api/axios';

/* ─── helpers ──────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/* ─── Sub-components ────────────────────────────────────────── */

function SummaryCard({ summary, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="h-12 bg-gray-100 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/4 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Earned', value: `${summary?.total_earned ?? 0} pts`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Total Redeemed', value: `${summary?.total_redeemed ?? 0} pts`, icon: Gift, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    { label: 'Max per Purchase', value: '₹500', icon: Info, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 border border-gray-200 shrink-0">
          <Award size={28} strokeWidth={1.75} className="text-gray-600" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Current Balance</p>
          <p className="text-4xl font-bold text-gray-900 leading-none">
            {summary?.current_points ?? 0}
            <span className="text-xl font-semibold text-gray-500 ml-2">Points</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Worth <span className="font-semibold text-gray-700">₹{summary?.worth_inr ?? 0}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`flex items-center gap-3 rounded-xl p-3.5 border ${bg} ${border}`}>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${bg}`}>
              <Icon size={16} strokeWidth={2} className={color} />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide leading-none mb-1">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorksCard() {
  const rules = [
    { icon: Share2, title: 'Share & Earn', desc: 'Earn 20 Edge Points every time another user opens your shared CoBrother listing link.' },
    { icon: Gift, title: '10 Points = ₹1', desc: 'Your Edge Points convert to real rupee discounts at checkout.' },
    { icon: ChevronRight, title: 'Where to Redeem', desc: 'Use on Domains, Ventures, Technologies, Auctions, and other eligible purchases.' },
    { icon: Info, title: 'Max Redemption', desc: 'Maximum discount per purchase is ₹500 (5,000 points).' },
    { icon: Clock, title: 'Duplicate Policy', desc: 'Duplicate visits and self-referrals do not earn additional points.' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Info size={16} strokeWidth={2} className="text-gray-400" />
        How Edge Points Work
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rules.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 transition-colors">
            <div className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
              <Icon size={15} strokeWidth={2} className="text-gray-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 mb-0.5">{title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTable({ history, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="h-5 bg-gray-100 rounded w-1/4 mb-5 animate-pulse" />
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock size={16} strokeWidth={2} className="text-gray-400" />
        Points History
      </h2>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 border border-gray-200 mx-auto mb-4">
            <Award size={26} strokeWidth={1.75} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-800 mb-1">No history yet</p>
          <p className="text-sm text-gray-500">You haven't earned any Edge Points yet.</p>
          <p className="text-sm text-gray-500 mt-1">Share Domains, Ventures, Technologies, or Auctions to start earning rewards.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Date &amp; Time</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Activity</th>
                <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Points</th>
                <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((row) => {
                const isPositive = row.points > 0;
                return (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                    <td className="py-3 px-2 text-gray-800 font-medium">{row.description || row.transaction_type}</td>
                    <td className={`py-3 px-2 text-right font-bold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '+' : ''}{row.points}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Completed
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReferralActivityTable({ referrals, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="h-5 bg-gray-100 rounded w-1/4 mb-5 animate-pulse" />
        <div className="flex flex-col gap-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Share2 size={16} strokeWidth={2} className="text-gray-400" />
        Referral Activity
      </h2>

      {referrals.length === 0 ? (
        <div className="text-center py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 border border-gray-200 mx-auto mb-4">
            <Share2 size={24} strokeWidth={1.75} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-800 mb-1">No referrals yet</p>
          <p className="text-sm text-gray-500">Share your listing links to start earning referral rewards.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Listing Shared</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Visitor</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Date</th>
                <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Reward Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {referrals.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-2">
                    <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                      {row.listing_type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 font-mono text-xs">{row.visitor_ip || '—'}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="py-3 px-2 text-right">
                    {row.points_awarded > 0 ? (
                      <span className="font-bold text-emerald-600">+{row.points_awarded} pts</span>
                    ) : (
                      <span className="text-gray-400 text-xs">No reward</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function EdgePointsPage() {
  const [summary, setSummary]     = useState(null);
  const [history, setHistory]     = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, historyRes, referralsRes] = await Promise.all([
        api.get('/api/v1/edge-points/summary'),
        api.get('/api/v1/edge-points/history'),
        api.get('/api/v1/edge-points/referral-history'),
      ]);
      if (summaryRes.data?.success)   setSummary(summaryRes.data.data);
      if (historyRes.data?.success)   setHistory(historyRes.data.data ?? []);
      if (referralsRes.data?.success) setReferrals(referralsRes.data.data ?? []);
    } catch (err) {
      console.error('EdgePointsPage: failed to load data', err);
      setError('Failed to load Edge Points data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 m-0 flex items-center gap-3">
              <Award size={28} strokeWidth={1.75} className="text-gray-600 shrink-0" />
              Edge Points
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Earn points by sharing listings. Redeem them for discounts at checkout.
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="btn-secondary shrink-0 text-sm"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <SummaryCard summary={summary} loading={loading} />
          <HowItWorksCard />
          <HistoryTable history={history} loading={loading} />
          <ReferralActivityTable referrals={referrals} loading={loading} />
        </div>
      </div>
    </AppLayout>
  );
}
