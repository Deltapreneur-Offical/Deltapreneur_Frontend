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
      <div className="relative overflow-hidden bg-gradient-to-br from-[#C2410C] via-[#9A3412] to-[#7C2D12] border border-[#FB923C]/40 text-white rounded-2xl p-6 shadow-xl shadow-orange-900/20 w-full flex flex-col md:flex-row gap-6 md:items-center justify-between transition-all duration-300 hover:shadow-orange-900/25 hover:shadow-2xl">
        {/* Glow effect background */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-orange-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-white/10 border border-white/20 rounded-xl shrink-0">
            <Wallet className="h-6 w-6 text-[#FED7AA]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#FED7AA]">Edge Points Wallet</span>
              <button 
                onClick={handleRefresh}
                className={`p-1 rounded hover:bg-white/10 text-[#FED7AA] hover:text-white transition-all ${refreshing ? 'animate-spin' : ''}`}
                title="Refresh Wallet"
              >
                <RefreshCw size={12} />
              </button>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tracking-tight text-white">{summary.current_points}</span>
              <span className="text-sm font-semibold text-orange-100/80">Points</span>
            </div>
            <p className="text-[12px] text-orange-100/80 mt-0.5">
              Worth <span className="text-[#FED7AA] font-bold">₹{summary.worth_inr}</span> (10 Points = ₹1)
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-8 md:min-w-[280px]">
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-100/70 block">Total Earned</span>
            <div className="flex items-center gap-1 mt-0.5 text-[#FED7AA] font-bold text-base">
              <ArrowUpRight size={16} />
              <span>{summary.total_earned} pts</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-100/70 block">Total Redeemed</span>
            <div className="flex items-center gap-1 mt-0.5 text-white font-bold text-base">
              <ArrowDownLeft size={16} />
              <span>{summary.total_redeemed} pts</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full md:w-auto px-5 py-3 bg-white text-[#C2410C] hover:bg-[#FFF7ED] border border-white/70 text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-950/20 hover:shadow-orange-950/25 transition-all duration-200"
        >
          <History size={16} />
          View History & Referrals
        </button>
      </div>

      {/* History & Referrals Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-[#C2410C] via-[#9A3412] to-[#7C2D12] border border-[#FB923C]/40 text-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg text-[#FED7AA] border border-white/20">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Edge Wallet Details</h3>
                  <p className="text-[11px] text-orange-100/75">Track your referral activity and points history</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-orange-100/75 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-white/20 px-4 bg-white/10">
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 text-[13px] font-bold transition-all relative border-b-2 ${
                  activeTab === 'history'
                    ? 'text-[#FED7AA] border-[#FED7AA]'
                    : 'text-orange-100/70 border-transparent hover:text-white'
                }`}
              >
                Points History
              </button>
              <button
                onClick={() => setActiveTab('referrals')}
                className={`px-4 py-3 text-[13px] font-bold transition-all relative border-b-2 ${
                  activeTab === 'referrals'
                    ? 'text-[#FED7AA] border-[#FED7AA]'
                    : 'text-orange-100/70 border-transparent hover:text-white'
                }`}
              >
                Referral Log
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
              {activeTab === 'history' ? (
                history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-orange-100/70 text-center">
                    <History size={40} className="stroke-[1.5] mb-2 text-orange-100/60" />
                    <p className="text-sm font-semibold">No points transactions yet</p>
                    <p className="text-xs max-w-[240px] mt-1 leading-relaxed">Transactions will show up here when you earn or redeem points</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {history.map((item) => (
                      <div key={item.id} className="bg-white/10 border border-white/15 rounded-xl p-4 flex items-center justify-between hover:border-orange-200/40 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            item.points > 0 
                              ? 'bg-white/10 text-[#FED7AA] border border-white/20'
                              : 'bg-white/10 text-white border border-white/20'
                          }`}>
                            {item.points > 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-100/65">{item.transaction_type}</span>
                            <p className="text-[13px] font-semibold text-white mt-0.5">{item.description}</p>
                            <span className="text-[10px] text-orange-100/65 block mt-1">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[15px] font-extrabold ${item.points > 0 ? 'text-[#FED7AA]' : 'text-white'}`}>
                          {item.points > 0 ? `+${item.points}` : item.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                referrals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-orange-100/70 text-center">
                    <Gift size={40} className="stroke-[1.5] mb-2 text-orange-100/60" />
                    <p className="text-sm font-semibold">No successful referrals yet</p>
                    <p className="text-xs max-w-[240px] mt-1 leading-relaxed">Share your links with other users to earn 20 points per view!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {referrals.map((ref) => (
                      <div key={ref.id} className="bg-white/10 border border-white/15 rounded-xl p-4 flex items-center justify-between hover:border-orange-200/40 transition-all">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-[#FED7AA] px-1.5 py-0.5 bg-white/10 rounded border border-white/20">{ref.listing_type}</span>
                            <span className="text-[11px] text-orange-100/70">ID: {ref.listing_id.slice(0, 8)}...</span>
                          </div>
                          <p className="text-[13px] font-semibold text-white mt-1.5">
                            Referred Visitor IP: <span className="text-orange-100/80 font-mono text-[12px]">{ref.visitor_ip}</span>
                          </p>
                          <span className="text-[10px] text-orange-100/65 block mt-1">
                            {new Date(ref.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[15px] font-extrabold text-[#FED7AA]">+{ref.points_awarded}</span>
                          <span className="text-[10px] text-orange-100/65 block">earned</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white/10 border-t border-white/20 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-white/70 bg-white hover:bg-[#FFF7ED] text-[#C2410C] text-xs font-bold rounded-lg transition-all"
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
