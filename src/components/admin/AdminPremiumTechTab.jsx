import React, { useState, useEffect } from 'react';
import { technologyServicesAPI } from '../../api/technologyServicesApi';
import {
  Wallet,
  AlertTriangle,
  Info,
  Percent,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  FileText,
  Activity,
  Layers,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Edit3,
  RotateCw,
  Search,
} from 'lucide-react';

export default function AdminPremiumTechTab() {
  const [config, setConfig] = useState({
    global_margin_percent: 15.0,
    wallet_balance: 145.50,
    warning_threshold: 7.00,
    wallet_warning_active: false,
    configured: false,
    test_mode: true,
    allow_live: false,
    admin_message:
      'ResellPortal API credentials have not been configured yet. API keys will be added after the provider wallet is funded and API access is generated.',
    total_services: 17,
    active_subscriptions_count: 0,
  });

  const [marginInput, setMarginInput] = useState('15');
  const [services, setServices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [failedItems, setFailedItems] = useState([]);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingMargin, setSavingMargin] = useState(false);
  const [activeTab, setActiveTab] = useState('catalogue'); // catalogue | subscriptions | renewals | failed | status | logs

  // Price override modal state
  const [editingService, setEditingService] = useState(null);
  const [overrideMonthly, setOverrideMonthly] = useState('');
  const [overrideAnnually, setOverrideAnnually] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [retryingId, setRetryingId] = useState(null);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [cfgRes, servRes, subsRes, renRes, failedRes, statusRes, logsRes] = await Promise.allSettled([
        technologyServicesAPI.getAdminConfig(),
        technologyServicesAPI.getAdminServices(),
        technologyServicesAPI.getAdminSubscriptions(),
        technologyServicesAPI.getRenewals(),
        technologyServicesAPI.getFailedProvisioning(),
        technologyServicesAPI.getServiceStatus(),
        technologyServicesAPI.getAdminLogs(),
      ]);

      if (cfgRes.status === 'fulfilled') {
        const c = cfgRes.value?.data || cfgRes.value;
        setConfig(c);
        setMarginInput(String(c.global_margin_percent || 15));
      }
      if (servRes.status === 'fulfilled') {
        setServices(servRes.value?.data || servRes.value || []);
      }
      if (subsRes.status === 'fulfilled') {
        setSubscriptions(subsRes.value?.data || subsRes.value || []);
      }
      if (renRes.status === 'fulfilled') {
        setRenewals(renRes.value?.data || renRes.value || []);
      }
      if (failedRes.status === 'fulfilled') {
        setFailedItems(failedRes.value?.data || failedRes.value || []);
      }
      if (statusRes.status === 'fulfilled') {
        setServiceStatus(statusRes.value?.data || statusRes.value || null);
      }
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value?.data || logsRes.value || []);
      }
    } catch (err) {
      console.error('[AdminPremiumTechTab] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleSaveMargin = async () => {
    try {
      setSavingMargin(true);
      const val = parseFloat(marginInput) || 15.0;
      await technologyServicesAPI.updateAdminConfig({ global_margin_percent: val });
      setConfig((prev) => ({ ...prev, global_margin_percent: val }));
      alert('Global margin updated successfully!');
      loadAdminData();
    } catch {
      alert('Failed to update global margin.');
    } finally {
      setSavingMargin(false);
    }
  };

  const handleToggleService = async (slug, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      await technologyServicesAPI.toggleService(slug, { is_available: nextStatus });
      setServices((prev) =>
        prev.map((s) => (s.slug === slug ? { ...s, is_available: nextStatus } : s))
      );
    } catch {
      alert('Failed to toggle service status.');
    }
  };

  const handleOpenOverrideModal = (service) => {
    setEditingService(service);
    setOverrideMonthly(service.price_override_monthly != null ? String(service.price_override_monthly) : '');
    setOverrideAnnually(service.price_override_annually != null ? String(service.price_override_annually) : '');
  };

  const handleSavePriceOverride = async () => {
    if (!editingService) return;
    try {
      setSavingOverride(true);
      const mVal = overrideMonthly.trim() !== '' ? parseFloat(overrideMonthly) : null;
      const aVal = overrideAnnually.trim() !== '' ? parseFloat(overrideAnnually) : null;

      await technologyServicesAPI.overridePrice(editingService.slug, {
        price_override_monthly: mVal,
        price_override_annually: aVal,
      });

      setEditingService(null);
      alert(`Pricing override saved for ${editingService.name}!`);
      loadAdminData();
    } catch {
      alert('Failed to save pricing override.');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleRetryProvisioning = async (itemId) => {
    try {
      setRetryingId(itemId);
      await technologyServicesAPI.retryProvisioning(itemId);
      alert('Provisioning retry executed successfully!');
      loadAdminData();
    } catch {
      alert('Failed to retry provisioning.');
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500 font-medium">Loading Premium Tech Admin Console...</p>
      </div>
    );
  }

  const isLowWallet = config.wallet_balance < config.warning_threshold;
  const isUnconfigured = !config.configured;

  return (
    <div className="space-y-8">
      {/* 1. Unconfigured Credentials Notice Banner */}
      {isUnconfigured && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/90 p-5 text-amber-900 shadow-sm flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Info className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-base text-amber-950">ResellPortal Integration Status</h4>
              <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                Unconfigured (Pending Wallet Funding)
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
              {config.admin_message ||
                'ResellPortal API credentials have not been configured yet. API keys will be added after the provider wallet is funded and API access is generated.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Reseller Wallet Low Balance Alert Banner */}
      {isLowWallet && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/90 p-5 text-red-900 shadow-sm flex items-start gap-4 animate-pulse">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-base">Warning: Reseller Wallet Balance Low</h4>
            <p className="text-xs text-red-700 mt-1">
              Your provider reseller balance is currently <strong className="font-extrabold text-red-900">${config.wallet_balance.toFixed(2)}</strong>, which is below the minimum required threshold of <strong>${config.warning_threshold.toFixed(2)}</strong>.
              Automated service provisioning may stall if balance is depleted. Please top up your reseller account.
            </p>
          </div>
        </div>
      )}

      {/* 3. Top Metrics & Config Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Wallet Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reseller Wallet</span>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isLowWallet ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-gray-900">${config.wallet_balance.toFixed(2)}</div>
            <span className="text-[10px] font-semibold text-gray-400">Warning threshold: ${config.warning_threshold.toFixed(2)}</span>
          </div>
        </div>

        {/* Global Margin Setting */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Global Margin</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input
              type="number"
              value={marginInput}
              onChange={(e) => setMarginInput(e.target.value)}
              className="w-24 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-bold text-gray-900 focus:border-indigo-600 focus:outline-none"
            />
            <span className="text-sm font-bold text-gray-700">%</span>
            <button
              onClick={handleSaveMargin}
              disabled={savingMargin}
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              {savingMargin ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Subscriptions</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-gray-900">{config.active_subscriptions_count}</div>
            <span className="text-[10px] font-semibold text-gray-400">Customer SaaS instances</span>
          </div>
        </div>

        {/* Mode & Health Status */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">API Mode</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-extrabold text-gray-900">
                {config.test_mode ? 'TEST MODE (test_mode: true)' : 'LIVE MODE'}
              </span>
            </div>
            <span className="block text-[10px] font-semibold text-gray-400">
              {config.configured ? 'Live API Connected' : 'Mock Dev Fallback (Credentials Blank)'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-gray-200 pb-3 gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'catalogue' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Service Catalogue ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'subscriptions' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Orders & Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('renewals')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'renewals' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Renewals ({renewals.length})
          </button>
          <button
            onClick={() => setActiveTab('failed')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'failed' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Failed Provisioning ({failedItems.length})
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'status' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Service Status
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'logs' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Audit Logs ({logs.length})
          </button>
        </div>

        <button
          onClick={loadAdminData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* 5. Tab Content: Catalogue with Price Overrides & Enable/Disable */}
      {activeTab === 'catalogue' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Service</th>
                <th className="p-4">Category</th>
                <th className="p-4">Base Cost</th>
                <th className="p-4">Customer Price (+{config.global_margin_percent}% Margin)</th>
                <th className="p-4">Price Override</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {services.map((s) => {
                const avail = s.is_available !== false;
                const hasOverride = s.price_override_monthly != null;
                return (
                  <tr key={s.slug} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{s.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{s.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600">
                        {s.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-gray-500">
                      ${s.base_starting_price || 15}/mo
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      ${s.calculated_price}/mo
                    </td>
                    <td className="p-4 font-bold text-indigo-600">
                      {hasOverride ? (
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 font-bold">
                          ${s.price_override_monthly}/mo (Override)
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">None</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${avail ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {avail ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenOverrideModal(s)}
                        className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Price Override
                      </button>
                      <button
                        onClick={() => handleToggleService(s.slug, avail)}
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold transition-colors ${
                          avail
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {avail ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                        {avail ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Tab Content: Subscriptions & Orders */}
      {activeTab === 'subscriptions' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {subscriptions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No customer subscriptions or orders recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Plan & Cycle</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Provider Order ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-mono text-gray-900">{sub.user_id}</td>
                    <td className="p-4 font-bold text-gray-900">{sub.service_name}</td>
                    <td className="p-4 capitalize">{sub.plan_code} ({sub.billing_cycle})</td>
                    <td className="p-4 font-bold text-gray-900">${sub.price} {sub.currency}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-gray-500">{sub.provider_subscription_id || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 7. Tab Content: Renewals */}
      {activeTab === 'renewals' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {renewals.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No upcoming renewals found.</div>
          ) : (
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Plan & Cycle</th>
                  <th className="p-4">Current Period End</th>
                  <th className="p-4">Auto-Renew</th>
                  <th className="p-4 font-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {renewals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-mono text-gray-900">{r.user_id}</td>
                    <td className="p-4 font-bold text-gray-900">{r.service_name}</td>
                    <td className="p-4 capitalize">{r.plan_code} ({r.billing_cycle})</td>
                    <td className="p-4 font-mono text-gray-600">
                      {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 font-bold">
                      {r.auto_renew ? (
                        <span className="text-emerald-600">Enabled</span>
                      ) : (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 8. Tab Content: Failed Provisioning */}
      {activeTab === 'failed' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-base text-gray-900">Failed Provisioning Queue</h4>
            <span className="text-xs font-medium text-gray-500">Track and retry failed provider handshake orders</span>
          </div>

          {failedItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No failed provisioning items recorded.</div>
          ) : (
            <div className="space-y-3">
              {failedItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-red-100 bg-red-50/40 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-gray-900">{item.service_name}</span>
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">{item.status}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">User: <span className="font-mono">{item.user_email}</span> | Plan: <span className="capitalize">{item.plan_code}</span> ({item.billing_cycle})</p>
                    <p className="text-[11px] text-red-600 mt-1 font-mono">Reason: {item.error_reason}</p>
                  </div>
                  <button
                    onClick={() => handleRetryProvisioning(item.id)}
                    disabled={retryingId === item.id || item.status === 'RESOLVED'}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all ${
                      item.status === 'RESOLVED'
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    <RotateCw className={`h-4 w-4 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                    {retryingId === item.id ? 'Retrying...' : item.status === 'RESOLVED' ? 'Resolved' : 'Retry Provisioning'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 9. Tab Content: Service Status & Provider Health */}
      {activeTab === 'status' && serviceStatus && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h4 className="font-extrabold text-base text-gray-900">ResellPortal Integration Health</h4>
              <p className="text-xs text-gray-500">Live connection and environment mode diagnosis</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${serviceStatus.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {serviceStatus.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-gray-50 p-4 space-y-2 border border-gray-100">
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Provider Base URL:</span><span className="font-mono font-bold text-gray-900">{serviceStatus.api_base_url}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Credentials Configured:</span><span className="font-bold">{serviceStatus.configured ? 'Yes (Live Keys Set)' : 'No (Blank / Pending Wallet)'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Environment Test Mode:</span><span className="font-mono font-bold text-indigo-600">{String(serviceStatus.test_mode)} (POST/DELETE test_mode: true)</span></div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 space-y-2 border border-gray-100">
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Provider Wallet Balance:</span><span className="font-extrabold text-gray-900">${serviceStatus.wallet_balance?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Warning Threshold:</span><span className="font-bold text-gray-700">${serviceStatus.warning_threshold?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-medium">API Connection Latency:</span><span className="font-mono text-emerald-600">{serviceStatus.latency_ms} ms</span></div>
            </div>
          </div>

          {serviceStatus.admin_message && (
            <div className="rounded-xl bg-amber-50 p-4 text-amber-900 text-xs font-medium border border-amber-200">
              ℹ️ {serviceStatus.admin_message}
            </div>
          )}
        </div>
      )}

      {/* 10. Tab Content: Logs */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
          <h4 className="font-bold text-sm text-gray-900">Provisioning & Renewal Audit Logs</h4>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between rounded-xl bg-gray-50 p-4 text-xs border border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{log.event}</span>
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">{log.service_slug}</span>
                  </div>
                  <p className="text-gray-600 mt-1">{log.message}</p>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per Product Pricing Override Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-gray-900">Set Price Override</h3>
              <button onClick={() => setEditingService(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-900">{editingService.name}</p>
              <p className="text-[11px] text-gray-400">Base cost: ${editingService.base_starting_price}/mo | Margin price: ${editingService.calculated_price}/mo</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Custom Monthly Price ($)</label>
                <input
                  type="number"
                  placeholder="Leave empty for default margin calculation"
                  value={overrideMonthly}
                  onChange={(e) => setOverrideMonthly(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Custom Annual Price ($)</label>
                <input
                  type="number"
                  placeholder="Leave empty for default margin calculation"
                  value={overrideAnnually}
                  onChange={(e) => setOverrideAnnually(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingService(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePriceOverride}
                disabled={savingOverride}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
              >
                {savingOverride ? 'Saving...' : 'Save Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
