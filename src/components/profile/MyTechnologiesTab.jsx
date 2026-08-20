import React, { useState, useEffect } from 'react';
import { technologyServicesAPI } from '../../api/technologyServicesApi';
import { useCurrency } from '../../context/CurrencyContext';
import {
  Cpu,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  XCircle,
  FileText,
  Key,
  ExternalLink,
  Calendar,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export default function MyTechnologiesTab() {
  const { formatPrice, convertToInr } = useCurrency();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCredentials, setSelectedCredentials] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'renew'|'upgrade'|'cancel', sub: ... }
  const [actionLoading, setActionLoading] = useState(false);

  /** Subscription amounts are stored in their billing currency (default USD). */
  const formatStoredPrice = (amount, currency = 'USD') =>
    formatPrice(convertToInr(Number(amount) || 0, currency || 'USD'));

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await technologyServicesAPI.getMySubscriptions();
      setSubscriptions(res.data || res || []);
    } catch (err) {
      setError('Failed to load your technology subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleRenew = async (subId) => {
    try {
      setActionLoading(true);
      await technologyServicesAPI.renewSubscription(subId, { billing_cycle: 'monthly' });
      setActionModal(null);
      fetchSubscriptions();
    } catch {
      alert('Failed to renew subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async (subId, newPlan) => {
    try {
      setActionLoading(true);
      await technologyServicesAPI.upgradeSubscription(subId, { new_plan_code: newPlan });
      setActionModal(null);
      fetchSubscriptions();
    } catch {
      alert('Failed to upgrade subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (subId) => {
    try {
      setActionLoading(true);
      await technologyServicesAPI.cancelSubscription(subId);
      setActionModal(null);
      fetchSubscriptions();
    } catch {
      alert('Failed to cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFetchInvoices = async (subId) => {
    try {
      const res = await technologyServicesAPI.getInvoices(subId);
      setSelectedInvoices(res.data || res || []);
    } catch {
      setSelectedInvoices([]);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Loading your technology subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Technology Services</h2>
          <p className="text-xs text-gray-500 mt-1">Manage your active provider-powered SaaS & technology subscriptions.</p>
        </div>
        <button
          onClick={fetchSubscriptions}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50/50">
          <Cpu className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-base font-bold text-gray-900">No active technology subscriptions</h3>
          <p className="mt-1 text-xs text-gray-500">Explore HubRegistrar Technology Services catalogue to provision new applications.</p>
          <a
            href="/technology"
            className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
          >
            Browse Catalogue
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptions.map((sub) => {
            const isActive = sub.status === 'ACTIVE';

            return (
              <div
                key={sub.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                        {sub.plan_code} PLAN
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 mt-1">{sub.service_name}</h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {sub.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 my-4 border-t border-b border-gray-50 py-3">
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-bold text-gray-900">
                        {formatStoredPrice(sub.price, sub.currency)} / {sub.billing_cycle}
                      </span>
                    </div>
                    {sub.current_period_end && (
                      <div className="flex justify-between">
                        <span>Renewal Date:</span>
                        <span className="font-semibold text-gray-800">
                          {new Date(sub.current_period_end).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setSelectedCredentials(sub.credentials)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100"
                  >
                    <Key className="h-3.5 w-3.5" />
                    Credentials
                  </button>

                  <button
                    onClick={() => handleFetchInvoices(sub.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Invoices
                  </button>

                  {isActive && (
                    <>
                      <button
                        onClick={() => setActionModal({ type: 'upgrade', sub })}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Upgrade
                      </button>

                      <button
                        onClick={() => setActionModal({ type: 'cancel', sub })}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Credentials Modal */}
      {selectedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Service Credentials</h3>
            <p className="text-xs text-gray-500 mb-4">White-labelled access details for your HubRegistrar service.</p>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-xs font-mono text-gray-800 border border-gray-100">
              <div>
                <span className="text-gray-500 font-sans block text-[10px] uppercase font-bold">Access URL:</span>
                <a
                  href={selectedCredentials.access_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 underline break-all flex items-center gap-1 mt-0.5 font-bold"
                >
                  {selectedCredentials.access_url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <div>
                <span className="text-gray-500 font-sans block text-[10px] uppercase font-bold">Username:</span>
                <span>{selectedCredentials.username}</span>
              </div>
              {selectedCredentials.access_token && (
                <div>
                  <span className="text-gray-500 font-sans block text-[10px] uppercase font-bold">API Token:</span>
                  <span className="break-all">{selectedCredentials.access_token}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedCredentials(null)}
              className="mt-6 w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invoices Modal */}
      {selectedInvoices !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Subscription Invoices</h3>

            {selectedInvoices.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No invoices found.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-xs border border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900">{inv.invoice_number}</span>
                      <div className="text-[10px] text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-gray-900">
                        {formatStoredPrice(inv.amount, inv.currency)}
                      </span>
                      <span className="block text-[10px] text-emerald-600 font-bold">{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedInvoices(null)}
              className="mt-6 w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upgrade / Cancel Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            {actionModal.type === 'cancel' ? (
              <div>
                <h3 className="text-lg font-bold text-red-600 mb-2">Cancel Subscription</h3>
                <p className="text-xs text-gray-600 mb-6">
                  Are you sure you want to cancel your subscription to <strong>{actionModal.sub.service_name}</strong>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActionModal(null)}
                    disabled={actionLoading}
                    className="w-1/2 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={() => handleCancel(actionModal.sub.id)}
                    disabled={actionLoading}
                    className="w-1/2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700"
                  >
                    {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Upgrade Plan</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Upgrade your plan for <strong>{actionModal.sub.service_name}</strong>.
                </p>

                <div className="space-y-2 mb-6">
                  {['starter', 'pro', 'enterprise'].map((plan) => (
                    <button
                      key={plan}
                      onClick={() => handleUpgrade(actionModal.sub.id, plan)}
                      disabled={actionLoading || actionModal.sub.plan_code === plan}
                      className={`w-full text-left rounded-xl p-3 text-xs font-bold border transition-all flex justify-between items-center ${
                        actionModal.sub.plan_code === plan
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : 'bg-white text-gray-900 border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      <span className="uppercase">{plan} Plan</span>
                      {actionModal.sub.plan_code === plan && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Current</span>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setActionModal(null)}
                  className="w-full rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
