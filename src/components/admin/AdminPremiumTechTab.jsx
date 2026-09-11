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
  Copy,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
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
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [accessDetails, setAccessDetails] = useState(null);
  const [accessLoadingId, setAccessLoadingId] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [revealedFields, setRevealedFields] = useState({});

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
        const raw = failedRes.value?.data;
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setFailedItems(items);
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
      const res = await technologyServicesAPI.retryProvisioning(itemId);
      const body = res?.data?.data ?? res?.data ?? res;
      const status = String(body?.status || '').toUpperCase();
      const outcome = String(body?.outcome || '');
      if (status === 'ACTIVE' || outcome === 'activated' || outcome === 'adopted') {
        alert('Provisioning retry executed successfully!');
      } else if (body?.error && !body?.payment_status) {
        alert(body.error || 'Failed to retry provisioning.');
      } else {
        alert(
          body?.last_provider_error
            ? `Retry ran but activation is still pending: ${body.last_provider_error}`
            : 'Retry ran but activation is still pending. The purchase remains in Failed Provisioning.'
        );
      }
      loadAdminData();
    } catch {
      alert('Failed to retry provisioning.');
    } finally {
      setRetryingId(null);
    }
  };

  const copyValue = async (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be unavailable in some browsers */
    }
  };

  const handleViewAccessDetails = async (subscriptionId) => {
    try {
      setAccessLoadingId(subscriptionId);
      setRevealedFields({});
      const res = await technologyServicesAPI.getAdminSubscriptionAccessDetails(subscriptionId);
      setAccessDetails(res?.data || res || null);
    } catch {
      alert('Unable to load access details.');
    } finally {
      setAccessLoadingId(null);
    }
  };

  const handleResendAccessEmail = async (subscriptionId) => {
    try {
      setResendingId(subscriptionId);
      const res = await technologyServicesAPI.resendAccessEmail(subscriptionId);
      const body = res?.data || res;
      if (body?.success) {
        alert('Access email resent to the customer.');
        loadAdminData();
      } else {
        alert(body?.error || body?.detail || 'Unable to resend access email.');
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.error;
      alert(typeof detail === 'string' ? detail : 'Unable to resend access email.');
    } finally {
      setResendingId(null);
    }
  };

  const accessEmailLabel = (sub) => {
    const status = String(sub?.access_email_status || '').toUpperCase();
    if (status === 'SENT' || sub?.access_email_sent) return 'SENT';
    if (status === 'FAILED') return 'FAILED';
    return 'PENDING';
  };

  const emailQuery = subscriptionSearch.trim().toLowerCase();
  const visibleSubscriptions = emailQuery
    ? subscriptions.filter((sub) => {
        const email = String(sub.customer_email || '').toLowerCase();
        const name = String(sub.customer_name || '').toLowerCase();
        return email.includes(emailQuery) || name.includes(emailQuery);
      })
    : subscriptions;

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
                <th className="p-4">Provider Product Key</th>
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
                      {s.provider_product_key ? (
                        <span className="text-indigo-600">{s.provider_product_key}</span>
                      ) : (
                        <span className="text-gray-400">Not mapped</span>
                      )}
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
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-gray-900">Customer purchases</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  After successful service activation, Deltapreneur automatically sends the customer's
                  service access credentials to their registered email. Admins can use View Access Details
                  if a customer needs assistance or loses their access information.
                </p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  value={subscriptionSearch}
                  onChange={(e) => setSubscriptionSearch(e.target.value)}
                  placeholder="Search customer email"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs font-medium text-gray-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          {visibleSubscriptions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No customer subscriptions or orders recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 min-w-[1100px]">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Purchased</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Provider IDs</th>
                  <th className="p-4">Access</th>
                  <th className="p-4">Access Email</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {visibleSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{sub.customer_name || 'Unknown customer'}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-[11px] text-gray-600">{sub.customer_email || 'Email unavailable'}</span>
                        {sub.customer_email ? (
                          <button
                            type="button"
                            title="Copy customer email"
                            onClick={() => copyValue(sub.customer_email)}
                            className="text-gray-400 hover:text-indigo-600"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{sub.service_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{sub.service_slug}</div>
                    </td>
                    <td className="p-4 capitalize">
                      {sub.plan_code} ({sub.billing_cycle})
                    </td>
                    <td className="p-4 font-mono text-gray-600">
                      {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <div className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 inline-block">
                        {sub.status}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">Payment: {sub.payment_status || 'n/a'}</div>
                      <div className="text-[10px] text-gray-500">Provisioning: {sub.provisioning_status || sub.status}</div>
                    </td>
                    <td className="p-4 font-mono text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <span>Service: {sub.provider_subscription_id || 'N/A'}</span>
                        {sub.provider_subscription_id ? (
                          <button
                            type="button"
                            title="Copy provider service ID"
                            onClick={() => copyValue(sub.provider_subscription_id)}
                            className="text-gray-400 hover:text-indigo-600"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Order: {sub.provider_order_id || 'N/A'}</span>
                        {sub.provider_order_id ? (
                          <button
                            type="button"
                            title="Copy provider order ID"
                            onClick={() => copyValue(sub.provider_order_id)}
                            className="text-gray-400 hover:text-indigo-600"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4">
                      {sub.has_access_information ? (
                        <span className="text-emerald-700 font-bold">Available</span>
                      ) : (
                        <span className="text-gray-400">Not available</span>
                      )}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const emailStatus = accessEmailLabel(sub);
                        if (emailStatus === 'SENT') {
                          return <span className="text-emerald-700 font-bold">✓ Sent</span>;
                        }
                        if (emailStatus === 'FAILED') {
                          return <span className="text-amber-800 font-bold">⚠ Failed</span>;
                        }
                        return <span className="text-gray-600 font-bold">⏳ Pending</span>;
                      })()}
                    </td>
                    <td className="p-4 text-right space-y-2">
                      <button
                        type="button"
                        onClick={() => handleViewAccessDetails(sub.id)}
                        disabled={accessLoadingId === sub.id}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {accessLoadingId === sub.id ? 'Loading...' : 'View Access Details'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResendAccessEmail(sub.id)}
                        disabled={resendingId === sub.id}
                        className="ml-2 inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {resendingId === sub.id ? 'Sending...' : 'Resend Access Email'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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
                    <p className="text-[11px] text-gray-600 mt-1">
                      Payment: {item.payment_status || 'CAPTURED'}
                      {' · '}Provisioning: {item.provisioning_status || item.status}
                      {' · '}Attempts: {item.retry_count ?? item.provision_attempts ?? 0}/{item.max_retries ?? 5}
                      {' · '}{item.retry_eligible === false ? 'Needs review' : 'Retryable'}
                    </p>
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

      {accessDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Access details</h3>
                <p className="text-[11px] text-gray-500">{accessDetails.service_name} · {accessDetails.customer_email}</p>
              </div>
              <button type="button" onClick={() => setAccessDetails(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Copy only what you need, then email the customer manually from Deltapreneur. This screen does not send credentials.
            </p>
            {accessDetails.customer_email ? (
              <a
                href={`mailto:${encodeURIComponent(accessDetails.customer_email)}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700"
              >
                <Mail className="h-3.5 w-3.5" />
                Open email to customer
              </a>
            ) : null}
            {!accessDetails.access_available ? (
              <p className="text-sm font-semibold text-gray-700">Access information not available</p>
            ) : (
              <div className="space-y-3">
                {(accessDetails.fields || []).map((field) => {
                  const revealed = Boolean(revealedFields[field.key]);
                  const displayValue = field.sensitive && !revealed ? '••••••••' : field.value;
                  return (
                    <div key={field.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{field.label}</div>
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <span className="font-mono text-xs text-gray-900 break-all">{displayValue}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {field.sensitive ? (
                            <button
                              type="button"
                              onClick={() => setRevealedFields((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                              className="text-gray-500 hover:text-indigo-600"
                              title={revealed ? 'Hide' : 'Reveal'}
                            >
                              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => copyValue(field.value)}
                            className="text-gray-500 hover:text-indigo-600"
                            title="Copy"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
