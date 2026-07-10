import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, History, Gift, ArrowUpRight, ArrowDownLeft, X, RefreshCw } from 'lucide-react';
import api from '../../api/axios';

export default function EdgePointsWalletCard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState({
    current_points: 0,
    worth_inr: 0,
    total_earned: 0,
    total_redeemed: 0
  });
  const [history, setHistory] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'referrals'
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [summaryRes, historyRes, referralsRes] = await Promise.all([
        api.get('/api/v1/edge-points/summary'),
        api.get('/api/v1/edge-points/history'),
        api.get('/api/v1/edge-points/referral-history')
      ]);

      if (summaryRes.data?.success) setSummary(summaryRes.data.data);
      if (historyRes.data?.success) setHistory(historyRes.data.data);
      if (referralsRes.data?.success) setReferrals(referralsRes.data.data);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleRefresh = (e) => {
    e.stopPropagation();
    setRefreshing(true);
    fetchWalletData();
  };

  if (loading && !refreshing) {
    return (
      <div className="bg-white/40 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 animate-pulse h-48 w-full flex items-center justify-center">
        <div className="text-slate-400 font-medium">Loading Wallet...</div>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/90 via-slate-900 to-indigo-950/95 border border-indigo-950 text-white rounded-2xl p-6 shadow-xl w-full flex flex-col md:flex-row gap-6 md:items-center justify-between transition-all duration-300 hover:shadow-indigo-500/10 hover:shadow-2xl">
        {/* Glow effect background */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl shrink-0">
            <Wallet className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-300">Edge Points Wallet</span>
              <button 
                onClick={handleRefresh}
                className={`p-1 rounded hover:bg-white/10 text-indigo-300 hover:text-white transition-all ${refreshing ? 'animate-spin' : ''}`}
                title="Refresh Wallet"
              >
                <RefreshCw size={12} />
              </button>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tracking-tight text-white">{summary.current_points}</span>
              <span className="text-sm font-semibold text-slate-400">Points</span>
            </div>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Worth <span className="text-emerald-400 font-bold">₹{summary.worth_inr}</span> (10 Points = ₹1)
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-8 md:min-w-[280px]">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Earned</span>
            <div className="flex items-center gap-1 mt-0.5 text-emerald-400 font-bold text-base">
              <ArrowUpRight size={16} />
              <span>{summary.total_earned} pts</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Redeemed</span>
            <div className="flex items-center gap-1 mt-0.5 text-indigo-300 font-bold text-base">
              <ArrowDownLeft size={16} />
              <span>{summary.total_redeemed} pts</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all duration-200"
        >
          <History size={16} />
          View History & Referrals
        </button>
      </div>

      {/* History & Referrals Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Edge Wallet Details</h3>
                  <p className="text-[11px] text-slate-400">Track your referral activity and points history</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800/80 px-4 bg-slate-950/40">
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 text-[13px] font-bold transition-all relative border-b-2 ${
                  activeTab === 'history'
                    ? 'text-indigo-400 border-indigo-500'
                    : 'text-slate-400 border-transparent hover:text-slate-300'
                }`}
              >
                Points History
              </button>
              <button
                onClick={() => setActiveTab('referrals')}
                className={`px-4 py-3 text-[13px] font-bold transition-all relative border-b-2 ${
                  activeTab === 'referrals'
                    ? 'text-indigo-400 border-indigo-500'
                    : 'text-slate-400 border-transparent hover:text-slate-300'
                }`}
              >
                Referral Log
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
              {activeTab === 'history' ? (
                history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                    <History size={40} className="stroke-[1.5] mb-2 text-slate-600" />
                    <p className="text-sm font-semibold">No points transactions yet</p>
                    <p className="text-xs max-w-[240px] mt-1 leading-relaxed">Transactions will show up here when you earn or redeem points</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {history.map((item) => (
                      <div key={item.id} className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between hover:border-slate-700/60 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            item.points > 0 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                          }`}>
                            {item.points > 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.transaction_type}</span>
                            <p className="text-[13px] font-semibold text-white mt-0.5">{item.description}</p>
                            <span className="text-[10px] text-slate-500 block mt-1">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[15px] font-extrabold ${item.points > 0 ? 'text-emerald-400' : 'text-indigo-300'}`}>
                          {item.points > 0 ? `+${item.points}` : item.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                referrals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                    <Gift size={40} className="stroke-[1.5] mb-2 text-slate-600" />
                    <p className="text-sm font-semibold">No successful referrals yet</p>
                    <p className="text-xs max-w-[240px] mt-1 leading-relaxed">Share your links with other users to earn 20 points per view!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {referrals.map((ref) => (
                      <div key={ref.id} className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between hover:border-slate-700/60 transition-all">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-indigo-400 px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">{ref.listing_type}</span>
                            <span className="text-[11px] text-slate-400">ID: {ref.listing_id.slice(0, 8)}...</span>
                          </div>
                          <p className="text-[13px] font-semibold text-white mt-1.5">
                            Referred Visitor IP: <span className="text-slate-300 font-mono text-[12px]">{ref.visitor_ip}</span>
                          </p>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            {new Date(ref.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[15px] font-extrabold text-emerald-400">+{ref.points_awarded}</span>
                          <span className="text-[10px] text-slate-500 block">earned</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800/80 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
