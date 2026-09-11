import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { adminAPI, domainAPI } from '../../api/services';
import { invalidateTldMarqueeCache } from '../../utils/tldPriceMarqueeCache';

const SUPPORTED_TLDS = ['.com', '.in', '.net', '.org', '.co', '.io', '.ai'];
const PAGE_SIZE_OPTIONS = [25, 50, 100];

/* ─── Reusable commission input ────────────────────────────────────────── */
function CommissionInput({ id, label, hint, value, onChange, highlight }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '14px 16px',
        borderRadius: 12,
        border: highlight ? '1.5px solid #fdba74' : '1px solid #e5e7eb',
        background: highlight ? '#fff7ed' : '#f9fafb',
        transition: 'all 0.15s ease',
      }}
    >
      <label
        htmlFor={id}
        style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}
      >
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="0.00"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 36px 8px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#fff',
            fontSize: 14,
            fontWeight: 700,
            color: '#111827',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
        />
        <span style={{
          position: 'absolute', right: 12, fontSize: 13, color: '#6b7280', fontWeight: 600, pointerEvents: 'none',
        }}>
          %
        </span>
      </div>
      {hint && (
        <p style={{ fontSize: 11, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{hint}</p>
      )}
    </div>
  );
}

/* ─── TLD override input ────────────────────────────────────────────────── */
function TldOverrideInput({ defaultValue, value, onChange }) {
  const isUsingDefault = value === '' || value == null;
  const displayValue = isUsingDefault ? '' : value;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        placeholder={`${defaultValue}% (Default)`}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 28px 6px 10px',
          borderRadius: 6,
          border: isUsingDefault ? '1px dashed #d1d5db' : '1px solid #f97316',
          background: isUsingDefault ? '#f9fafb' : '#fff7ed',
          fontSize: 12,
          fontWeight: isUsingDefault ? 500 : 700,
          color: isUsingDefault ? '#6b7280' : '#c2410c',
          outline: 'none',
        }}
      />
      <span style={{
        position: 'absolute', right: 8, fontSize: 10, color: isUsingDefault ? '#9ca3af' : '#c2410c', fontWeight: 600, pointerEvents: 'none',
      }}>
        %
      </span>
    </div>
  );
}

/* ─── Product Card ──────────────────────────────────────────────────────── */
function ProductCard({ emoji, title, subtitle, accentColor, children }) {
  return (
    <section style={{
      borderRadius: 16,
      border: `1.5px solid ${accentColor}22`,
      background: '#fff',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 20px',
        background: `${accentColor}10`,
        borderBottom: `1.5px solid ${accentColor}22`,
      }}>
        <span style={{ fontSize: 22 }}>{emoji}</span>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>{title}</h4>
          <p style={{ margin: 0, fontSize: 11, color: '#6b7280', marginTop: 2 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </section>
  );
}

function SaveActions({ saving, onReset, onSave, compact = false }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
      <button
        type="button"
        className="btn-professional-outline-sm"
        onClick={onReset}
        disabled={saving}
      >
        Reset
      </button>
      <button
        type="button"
        className="btn-professional-sm"
        onClick={onSave}
        disabled={saving}
        style={compact ? { whiteSpace: 'nowrap' } : undefined}
      >
        {saving ? 'Saving…' : compact ? 'Save' : 'Save Commission Settings'}
      </button>
    </div>
  );
}

function hasTldOverride(config, tld) {
  if (!config) return false;
  return ['registration', 'premium_registration', 'renewal', 'transfer'].some((service) => hasServiceOverride(config, tld, service));
}

function hasServiceOverride(config, tld, service) {
  if (!config) return false;
  const val = config[service]?.by_tld?.[tld];
  return val !== '' && val != null;
}

function getTldOverrideServices(config, tld) {
  return ['registration', 'premium_registration', 'renewal', 'transfer'].filter((service) => hasServiceOverride(config, tld, service));
}

function countTldOverrides(config, tlds) {
  if (!config) return 0;
  return tlds.filter((tld) => hasTldOverride(config, tld)).length;
}

const SERVICE_FILTER_OPTIONS = [
  { value: 'any', label: 'Any commission type' },
  { value: 'registration-set', label: 'Registration margin set' },
  { value: 'renewal-set', label: 'Renewal margin set' },
  { value: 'transfer-set', label: 'Transfer margin set' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Extension A → Z' },
  { value: 'name-desc', label: 'Extension Z → A' },
  { value: 'custom-first', label: 'Margin set first' },
  { value: 'default-first', label: 'Not set first' },
];

const SERVICE_BADGE_LABELS = {
  registration: 'Reg',
  premium_registration: 'Prem',
  renewal: 'Ren',
  transfer: 'Trf',
};

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 999,
        border: active ? '1.5px solid #f97316' : '1px solid #cbd5e1',
        background: active ? '#fff7ed' : '#fff',
        color: active ? '#c2410c' : '#475569',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

export default function AdminOpenProviderCommissionTab() {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [allTlds, setAllTlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tldsLoading, setTldsLoading] = useState(true);

  const [tldSearch, setTldSearch] = useState('');
  const [overrideFilter, setOverrideFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('any');
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const tldSectionRef = useRef(null);

  // Live calculator states
  const [calcBase, setCalcBase] = useState('1000');
  const [calcRate, setCalcRate] = useState('3');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getDomainCommission();
      const raw = data?.data ?? {};
      const uiConfig = {
        registration: {
          default: ((raw.registration?.default ?? 0.03) * 100).toFixed(2).replace(/\.00$/, ''),
          by_tld: Object.fromEntries(
            Object.entries(raw.registration?.by_tld ?? {}).map(([tld, val]) => [
              tld,
              (val * 100).toFixed(2).replace(/\.00$/, ''),
            ]),
          ),
        },
        premium_registration: {
          default: ((raw.premium_registration?.default ?? raw.registration?.default ?? 0.03) * 100).toFixed(2).replace(/\.00$/, ''),
          by_tld: Object.fromEntries(
            Object.entries(raw.premium_registration?.by_tld ?? {}).map(([tld, val]) => [
              tld,
              (val * 100).toFixed(2).replace(/\.00$/, ''),
            ]),
          ),
        },
        renewal: {
          default: ((raw.renewal?.default ?? 0.03) * 100).toFixed(2).replace(/\.00$/, ''),
          by_tld: Object.fromEntries(
            Object.entries(raw.renewal?.by_tld ?? {}).map(([tld, val]) => [
              tld,
              (val * 100).toFixed(2).replace(/\.00$/, ''),
            ]),
          ),
        },
        transfer: {
          default: ((raw.transfer?.default ?? 0.03) * 100).toFixed(2).replace(/\.00$/, ''),
          by_tld: Object.fromEntries(
            Object.entries(raw.transfer?.by_tld ?? {}).map(([tld, val]) => [
              tld,
              (val * 100).toFixed(2).replace(/\.00$/, ''),
            ]),
          ),
        },
        email: {
          default: ((raw.email?.default ?? 0.0) * 100).toFixed(2).replace(/\.00$/, ''),
        },
        ssl: {
          default: ((raw.ssl?.default ?? 0.0) * 100).toFixed(2).replace(/\.00$/, ''),
        },
        dnssec: {
          default: ((raw.dnssec?.default ?? 0.0) * 100).toFixed(2).replace(/\.00$/, ''),
        },
        restore: {
          default: ((raw.restore?.default ?? 0.0) * 100).toFixed(2).replace(/\.00$/, ''),
        },
        easydmarc: {
          default: ((raw.easydmarc?.default ?? 0.0) * 100).toFixed(2).replace(/\.00$/, ''),
        },
        spamexperts: {
          default: ((raw.spamexperts?.default ?? 0.0) * 100).toFixed(2).replace(/\.00$/, ''),
        },
      };
      setConfig(uiConfig);
    } catch (err) {
      console.error('Failed to load domain commission rates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTlds = useCallback(async () => {
    setTldsLoading(true);
    try {
      const { data } = await domainAPI.listTlds();
      const tlds = Array.isArray(data?.tlds) ? data.tlds : [];
      setAllTlds(tlds);
    } catch {
      setAllTlds([]);
    } finally {
      setTldsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadTlds();
  }, [loadConfig, loadTlds]);

  const displayTlds = useMemo(
    () => (allTlds.length > 0 ? allTlds : SUPPORTED_TLDS),
    [allTlds],
  );

  const filteredTlds = useMemo(() => {
    const q = tldSearch.trim().toLowerCase().replace(/^\./, '');

    let list = displayTlds.filter((tld) => {
      const normalized = tld.toLowerCase().replace(/^\./, '');
      const matchesSearch = !q || normalized.includes(q) || tld.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const hasOverride = hasTldOverride(config, tld);
      if (overrideFilter === 'custom' && !hasOverride) return false;
      if (overrideFilter === 'default' && hasOverride) return false;

      if (serviceFilter === 'registration-set') return hasServiceOverride(config, tld, 'registration');
      if (serviceFilter === 'renewal-set') return hasServiceOverride(config, tld, 'renewal');
      if (serviceFilter === 'transfer-set') return hasServiceOverride(config, tld, 'transfer');

      return true;
    });

    list = [...list].sort((a, b) => {
      const aCustom = hasTldOverride(config, a);
      const bCustom = hasTldOverride(config, b);
      const nameA = a.toLowerCase();
      const nameB = b.toLowerCase();

      switch (sortBy) {
        case 'name-desc':
          return nameB.localeCompare(nameA);
        case 'custom-first':
          return Number(bCustom) - Number(aCustom) || nameA.localeCompare(nameB);
        case 'default-first':
          return Number(aCustom) - Number(bCustom) || nameA.localeCompare(nameB);
        case 'name-asc':
        default:
          return nameA.localeCompare(nameB);
      }
    });

    return list;
  }, [displayTlds, tldSearch, overrideFilter, serviceFilter, sortBy, config]);

  const totalPages = Math.max(1, Math.ceil(filteredTlds.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    setPage(1);
  }, [tldSearch, overrideFilter, serviceFilter, sortBy, pageSize]);

  const paginatedTlds = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTlds.slice(start, start + pageSize);
  }, [filteredTlds, safePage, pageSize]);

  const rangeStart = filteredTlds.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filteredTlds.length);
  const overrideCount = useMemo(
    () => countTldOverrides(config, displayTlds),
    [config, displayTlds],
  );
  const defaultCount = displayTlds.length - overrideCount;
  const hasActiveFilters = Boolean(tldSearch.trim()) || overrideFilter !== 'all' || serviceFilter !== 'any';

  const clearFilters = () => {
    setTldSearch('');
    setOverrideFilter('all');
    setServiceFilter('any');
    setSortBy('name-asc');
    setPage(1);
  };

  const handleGlobalRateChange = (service, value) => {
    setConfig((prev) => ({
      ...prev,
      [service]: {
        ...(prev[service] || { by_tld: {} }),
        default: value,
        by_tld: prev[service]?.by_tld || {},
      },
    }));
  };

  const handleTldOverrideChange = (service, tld, value) => {
    setConfig((prev) => {
      const current = prev[service] || { default: '', by_tld: {} };
      const byTld = { ...(current.by_tld || {}) };
      if (value === '' || value == null) {
        delete byTld[tld];
      } else {
        byTld[tld] = value;
      }
      return {
        ...prev,
        [service]: {
          ...current,
          by_tld: byTld,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const toBackend = (val) => {
        if (val === '' || val == null) return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parseFloat((parsed / 100).toFixed(6));
      };

      const payload = {
        registration: {
          default: toBackend(config.registration.default) ?? 0.03,
          by_tld: Object.fromEntries(
            Object.entries(config.registration.by_tld).map(([tld, val]) => [tld, toBackend(val)]),
          ),
        },
        premium_registration: {
          default: toBackend(config.premium_registration?.default) ?? toBackend(config.registration.default) ?? 0.03,
          by_tld: Object.fromEntries(
            Object.entries(config.premium_registration?.by_tld || {}).map(([tld, val]) => [tld, toBackend(val)]),
          ),
        },
        renewal: {
          default: toBackend(config.renewal.default) ?? 0.03,
          by_tld: Object.fromEntries(
            Object.entries(config.renewal.by_tld).map(([tld, val]) => [tld, toBackend(val)]),
          ),
        },
        transfer: {
          default: toBackend(config.transfer.default) ?? 0.03,
          by_tld: Object.fromEntries(
            Object.entries(config.transfer.by_tld).map(([tld, val]) => [tld, toBackend(val)]),
          ),
        },
        email: {
          default: toBackend(config.email.default) ?? 0.0,
        },
        ssl: {
          default: toBackend(config.ssl.default) ?? 0.0,
        },
        dnssec: {
          default: toBackend(config.dnssec.default) ?? 0.0,
        },
        restore: {
          default: toBackend(config.restore?.default) ?? 0.0,
        },
        easydmarc: {
          default: toBackend(config.easydmarc?.default) ?? 0.0,
        },
        spamexperts: {
          default: toBackend(config.spamexperts?.default) ?? 0.0,
        },
      };

      await adminAPI.updateDomainCommission(payload);
      invalidateTldMarqueeCache();
      alert(t('adminCommissionUpdated', 'OpenProvider commission configuration saved successfully.'));
      loadConfig();
    } catch (err) {
      alert(err?.response?.data?.error || t('adminCommissionSaveFailed', 'Failed to save commission rates.'));
    } finally {
      setSaving(false);
    }
  };

  const scrollToTldSection = () => {
    tldSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading || tldsLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ffedd5', borderTopColor: '#f97316', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Loading commission config…</p>
      </div>
    );
  }

  const basePrice = parseFloat(calcBase) || 0;
  const ratePct = parseFloat(calcRate) || 0;
  const calculatedCommission = basePrice * (ratePct / 100);
  const calculatedTotal = basePrice + calculatedCommission;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 88 }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: 16, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>OpenProvider Pricing &amp; Commission Settings</h3>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280', maxWidth: 700, lineHeight: 1.6 }}>
            Set markup commission rates for domain registration, renewal, transfer, email, SSL,
            restore, EasyDMARC, and SpamExperts.
            Commission rates set here are dynamically added on top of the live OpenProvider wholesale prices
            and reflected automatically across all storefront service cards and search results.
          </p>
        </div>
        <SaveActions saving={saving} onReset={loadConfig} onSave={handleSave} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* ── 1. GLOBAL DEFAULT RATES ────────────────────────────────────── */}
        <ProductCard
          emoji="🚀"
          title="Global Default Markups"
          subtitle="Applied globally for each category unless overridden per TLD"
          accentColor="#6366f1"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <CommissionInput
              id="global-registration"
              label="Domains Registration"
              hint="Markup for normal (non-premium) domain creates"
              value={config.registration.default}
              onChange={(val) => handleGlobalRateChange('registration', val)}
              highlight
            />
            <CommissionInput
              id="global-premium-registration"
              label="Delta Domains Registration"
              hint="Separate markup for OpenProvider registry-premium domains — not mixed with Domains"
              value={config.premium_registration?.default ?? ''}
              onChange={(val) => handleGlobalRateChange('premium_registration', val)}
              highlight
            />
            <CommissionInput
              id="global-renewal"
              label="Renewal Default"
              value={config.renewal.default}
              onChange={(val) => handleGlobalRateChange('renewal', val)}
              highlight
            />
            <CommissionInput
              id="global-transfer"
              label="Transfer Default"
              value={config.transfer.default}
              onChange={(val) => handleGlobalRateChange('transfer', val)}
            />
            <CommissionInput
              id="global-email"
              label="Email Services"
              value={config.email.default}
              onChange={(val) => handleGlobalRateChange('email', val)}
            />
            <CommissionInput
              id="global-ssl"
              label="SSL Certificates"
              value={config.ssl.default}
              onChange={(val) => handleGlobalRateChange('ssl', val)}
            />
            <CommissionInput
              id="global-dnssec"
              label="DNSSEC Setup"
              value={config.dnssec.default}
              onChange={(val) => handleGlobalRateChange('dnssec', val)}
            />
            <CommissionInput
              id="global-restore"
              label="Domain Restore"
              value={config.restore?.default ?? ''}
              onChange={(val) => handleGlobalRateChange('restore', val)}
            />
            <CommissionInput
              id="global-easydmarc"
              label="EasyDMARC"
              value={config.easydmarc?.default ?? ''}
              onChange={(val) => handleGlobalRateChange('easydmarc', val)}
            />
            <CommissionInput
              id="global-spamexperts"
              label="SpamExperts"
              value={config.spamexperts?.default ?? ''}
              onChange={(val) => handleGlobalRateChange('spamexperts', val)}
            />
          </div>
        </ProductCard>

        {/* ── 2. LIVE COMMISSION CALCULATOR ─────────────────────────────── */}
        <section style={{
          borderRadius: 16,
          border: '1.5px solid #10b98122',
          background: '#f0fdf4',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>🧮</span>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>Live Commission Calculator</h4>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 11, color: '#15803d', lineHeight: 1.5 }}>
              Test how commission percentages affect domain prices for buyers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#166534' }}>BASE COST (INR)</label>
                <input
                  type="number"
                  value={calcBase}
                  onChange={(e) => setCalcBase(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #bbf7d0',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#166534' }}>MARKUP PERCENTAGE</label>
                <input
                  type="number"
                  value={calcRate}
                  onChange={(e) => setCalcRate(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #bbf7d0',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid #d1fae5',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b5563' }}>
              <span>Base Provider Cost:</span>
              <span style={{ fontWeight: 600 }}>₹{basePrice.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#166534' }}>
              <span>Commission ({ratePct}%):</span>
              <span style={{ fontWeight: 600 }}>+₹{calculatedCommission.toFixed(2)}</span>
            </div>
            <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#111827' }}>
              <span>Storefront Customer Price:</span>
              <span style={{ color: '#10b981' }}>₹{calculatedTotal.toFixed(2)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* ── 3. PER-TLD COMMISSION OVERRIDES ─────────────────────────────── */}
      <div ref={tldSectionRef}>
        <ProductCard
          emoji="🌐"
          title="Per-TLD Commission Overrides"
          subtitle="Specify precise markup rates for individual domain extensions. Leave blank to use default."
          accentColor="#0ea5e9"
        >
          {/* Toolbar: search, filters, quick actions */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #e0f2fe',
            background: '#f0f9ff',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flex: 1, minWidth: 240 }}>
              <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}
                />
                <input
                  type="search"
                  placeholder="Search extension (e.g. com, .in, pro)…"
                  value={tldSearch}
                  onChange={(e) => setTldSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 34px',
                    borderRadius: 8,
                    border: '1px solid #bae6fd',
                    background: '#fff',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {tldSearch && (
                  <button
                    type="button"
                    onClick={() => setTldSearch('')}
                    aria-label="Clear search"
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      padding: 4,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                value={overrideFilter}
                onChange={(e) => setOverrideFilter(e.target.value)}
                aria-label="Margin status filter"
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #bae6fd',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Margin status: All</option>
                <option value="custom">Margin status: Set (custom)</option>
                <option value="default">Margin status: Not set (default)</option>
              </select>

              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                aria-label="Commission type filter"
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #bae6fd',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {SERVICE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort extensions"
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #bae6fd',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Rows per page"
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #bae6fd',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
            </div>

            <SaveActions saving={saving} onReset={loadConfig} onSave={handleSave} compact />
          </div>

          {/* Quick filter chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick filters:
            </span>
            <FilterChip active={overrideFilter === 'custom'} onClick={() => setOverrideFilter('custom')}>
              Margin set ({overrideCount})
            </FilterChip>
            <FilterChip active={overrideFilter === 'default'} onClick={() => setOverrideFilter('default')}>
              Not set ({defaultCount})
            </FilterChip>
            <FilterChip active={overrideFilter === 'all' && serviceFilter === 'any'} onClick={() => { setOverrideFilter('all'); setServiceFilter('any'); }}>
              Show all
            </FilterChip>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  padding: '5px 10px',
                  border: 'none',
                  background: 'transparent',
                  color: '#0ea5e9',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Summary stats */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: '#475569',
          }}>
            <span>
              <strong style={{ color: '#0f172a' }}>{displayTlds.length}</strong> total extensions
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>
              <strong style={{ color: '#c2410c' }}>{overrideCount}</strong> margin set
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>
              <strong style={{ color: '#64748b' }}>{defaultCount}</strong> using global default
            </span>
            {hasActiveFilters ? (
              <>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span>
                  Showing <strong style={{ color: '#0f172a' }}>{filteredTlds.length}</strong> matching filter
                </span>
              </>
            ) : null}
          </div>

          {/* Scrollable table with sticky header */}
          <div style={{
            overflow: 'auto',
            maxHeight: 'min(520px, 60vh)',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: '#374151',
                    width: '120px',
                    position: 'sticky',
                    top: 0,
                    background: '#f9fafb',
                    zIndex: 2,
                    boxShadow: '0 1px 0 #e5e7eb',
                  }}>
                    Extension
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: '#374151',
                    position: 'sticky',
                    top: 0,
                    background: '#f9fafb',
                    zIndex: 2,
                    boxShadow: '0 1px 0 #e5e7eb',
                  }}>
                    Registration Markup
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: '#374151',
                    position: 'sticky',
                    top: 0,
                    background: '#f9fafb',
                    zIndex: 2,
                    boxShadow: '0 1px 0 #e5e7eb',
                  }}>
                    Renewal Markup
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: '#374151',
                    position: 'sticky',
                    top: 0,
                    background: '#f9fafb',
                    zIndex: 2,
                    boxShadow: '0 1px 0 #e5e7eb',
                  }}>
                    Transfer Markup
                  </th>
                  <th style={{
                    textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700,
                    color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em',
                    boxShadow: '0 1px 0 #e5e7eb',
                  }}>
                    Premium Markup
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTlds.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                      No extensions match your filters. Try &quot;Margin set&quot; or &quot;Not set&quot; quick filters, or clear filters.
                    </td>
                  </tr>
                ) : (
                  paginatedTlds.map((tld) => {
                    const isCustom = hasTldOverride(config, tld);
                    const overrideServices = getTldOverrideServices(config, tld);
                    return (
                      <tr
                        key={tld}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isCustom ? '#faf5ff' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                          <div>{tld}</div>
                          {isCustom ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {overrideServices.map((service) => (
                                <span
                                  key={service}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: '#c2410c',
                                    background: '#fff7ed',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                  }}
                                >
                                  {SERVICE_BADGE_LABELS[service]} set
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>using default</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <TldOverrideInput
                            defaultValue={config.registration.default}
                            value={config.registration.by_tld[tld]}
                            onChange={(val) => handleTldOverrideChange('registration', tld, val)}
                          />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <TldOverrideInput
                            defaultValue={config.renewal.default}
                            value={config.renewal.by_tld[tld]}
                            onChange={(val) => handleTldOverrideChange('renewal', tld, val)}
                          />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <TldOverrideInput
                            defaultValue={config.transfer.default}
                            value={config.transfer.by_tld[tld]}
                            onChange={(val) => handleTldOverrideChange('transfer', tld, val)}
                          />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <TldOverrideInput
                            defaultValue={config.premium_registration?.default}
                            value={config.premium_registration?.by_tld?.[tld]}
                            onChange={(val) => handleTldOverrideChange('premium_registration', tld, val)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            paddingTop: 4,
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              {filteredTlds.length === 0 ? (
                'No results'
              ) : (
                <>
                  Showing <strong style={{ color: '#111827' }}>{rangeStart}–{rangeEnd}</strong> of{' '}
                  <strong style={{ color: '#111827' }}>{filteredTlds.length}</strong>
                  {tldSearch.trim() ? ' matching extensions' : ' extensions'}
                </>
              )}
            </p>
            <div className="admin-feature-pagination">
              <button
                type="button"
                className="admin-feature-page-btn"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="admin-feature-page-indicator">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                className="admin-feature-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </ProductCard>
      </div>

      {/* ── Sticky bottom save bar ─────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 30,
        marginTop: -8,
        padding: '12px 16px',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111827' }}>
            {displayTlds.length} extensions · {overrideCount} custom overrides
          </p>
          <button
            type="button"
            onClick={scrollToTldSection}
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'none',
              fontSize: 11,
              color: '#0ea5e9',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Jump to TLD overrides ↑
          </button>
        </div>
        <SaveActions saving={saving} onReset={loadConfig} onSave={handleSave} />
      </div>
    </div>
  );
}
