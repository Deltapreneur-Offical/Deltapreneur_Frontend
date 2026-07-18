import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI, domainAPI } from '../../api/services';

const SUPPORTED_TLDS = ['.com', '.in', '.net', '.org', '.co', '.io', '.ai'];

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
        border: highlight ? '1.5px solid #a78bfa' : '1px solid #e5e7eb',
        background: highlight ? '#faf5ff' : '#f9fafb',
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
          onFocus={(e) => (e.target.style.borderColor = '#8b5cf6')}
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
function TldOverrideInput({ tld, type, defaultValue, value, onChange }) {
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
          border: isUsingDefault ? '1px dashed #d1d5db' : '1px solid #8b5cf6',
          background: isUsingDefault ? '#f9fafb' : '#f5f3ff',
          fontSize: 12,
          fontWeight: isUsingDefault ? 500 : 700,
          color: isUsingDefault ? '#6b7280' : '#6d28d9',
          outline: 'none',
        }}
      />
      <span style={{
        position: 'absolute', right: 8, fontSize: 10, color: isUsingDefault ? '#9ca3af' : '#7c3aed', fontWeight: 600, pointerEvents: 'none',
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

export default function AdminOpenProviderCommissionTab() {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [allTlds, setAllTlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tldsLoading, setTldsLoading] = useState(true);

  // Live calculator states
  const [calcBase, setCalcBase] = useState('1000');
  const [calcRate, setCalcRate] = useState('3');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getDomainCommission();
      // Format backend rates (decimals) to UI rates (percentages)
      const raw = data?.data ?? {};
      const uiConfig = {
        registration: {
          default: ((raw.registration?.default ?? 0.03) * 100).toFixed(2).replace(/\.00$/, ''),
          by_tld: Object.fromEntries(
            Object.entries(raw.registration?.by_tld ?? {}).map(([tld, val]) => [
              tld,
              (val * 100).toFixed(2).replace(/\.00$/, '')
            ])
          ),
        },
        renewal: {
          default: ((raw.renewal?.default ?? 0.03) * 100).toFixed(2).replace(/\.00$/, ''),
          by_tld: Object.fromEntries(
            Object.entries(raw.renewal?.by_tld ?? {}).map(([tld, val]) => [
              tld,
              (val * 100).toFixed(2).replace(/\.00$/, '')
            ])
          ),
        },
        transfer: {
          default: ((raw.transfer?.default ?? 0.03) * 100).toFixed(2).replace(/\.00$/, ''),
          by_tld: Object.fromEntries(
            Object.entries(raw.transfer?.by_tld ?? {}).map(([tld, val]) => [
              tld,
              (val * 100).toFixed(2).replace(/\.00$/, '')
            ])
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
      };
      setConfig(uiConfig);
    } catch (err) {
      console.error("Failed to load domain commission rates:", err);
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

  const handleGlobalRateChange = (service, value) => {
    setConfig((prev) => ({
      ...prev,
      [service]: {
        ...prev[service],
        default: value,
      },
    }));
  };

  const handleTldOverrideChange = (service, tld, value) => {
    setConfig((prev) => {
      const byTld = { ...prev[service].by_tld };
      if (value === '' || value == null) {
        delete byTld[tld];
      } else {
        byTld[tld] = value;
      }
      return {
        ...prev,
        [service]: {
          ...prev[service],
          by_tld: byTld,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      // Convert UI rates (percentages) back to backend rates (decimals)
      const toBackend = (val) => {
        if (val === '' || val == null) return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parseFloat((parsed / 100).toFixed(6));
      };

      const payload = {
        registration: {
          default: toBackend(config.registration.default) ?? 0.03,
          by_tld: Object.fromEntries(
            Object.entries(config.registration.by_tld).map(([tld, val]) => [tld, toBackend(val)])
          ),
        },
        renewal: {
          default: toBackend(config.renewal.default) ?? 0.03,
          by_tld: Object.fromEntries(
            Object.entries(config.renewal.by_tld).map(([tld, val]) => [tld, toBackend(val)])
          ),
        },
        transfer: {
          default: toBackend(config.transfer.default) ?? 0.03,
          by_tld: Object.fromEntries(
            Object.entries(config.transfer.by_tld).map(([tld, val]) => [tld, toBackend(val)])
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
      };

      await adminAPI.updateDomainCommission(payload);
      alert(t('adminCommissionUpdated', 'OpenProvider commission configuration saved successfully.'));
      loadConfig();
    } catch (err) {
      alert(err?.response?.data?.error || t('adminCommissionSaveFailed', 'Failed to save commission rates.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || tldsLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Loading commission config…</p>
      </div>
    );
  }

  const basePrice = parseFloat(calcBase) || 0;
  const ratePct = parseFloat(calcRate) || 0;
  const calculatedCommission = basePrice * (ratePct / 100);
  const calculatedTotal = basePrice + calculatedCommission;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>OpenProvider Pricing &amp; Commission Settings</h3>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280', maxWidth: 700, lineHeight: 1.6 }}>
          Set markup commission rates for domain registration, renewal, transfer, email, and SSL.
          Commission rates set here are dynamically added on top of the live OpenProvider wholesale prices
          and reflected automatically across all storefront service cards and search results.
        </p>
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
              label="Registration Default"
              value={config.registration.default}
              onChange={(val) => handleGlobalRateChange('registration', val)}
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
      <ProductCard
        emoji="🌐"
        title="Per-TLD Commission Overrides"
        subtitle="Specify precise markup rates for individual domain extensions. Leave blank to use default."
        accentColor="#0ea5e9"
      >
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151', width: '100px' }}>Extension</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>Registration Markup</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>Renewal Markup</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>Transfer Markup</th>
              </tr>
            </thead>
            <tbody>
              {(allTlds.length > 0 ? allTlds : SUPPORTED_TLDS).map((tld) => (
                <tr key={tld} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>{tld}</td>
                  <td style={{ padding: '8px 16px' }}>
                    <TldOverrideInput
                      tld={tld}
                      type="registration"
                      defaultValue={config.registration.default}
                      value={config.registration.by_tld[tld]}
                      onChange={(val) => handleTldOverrideChange('registration', tld, val)}
                    />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <TldOverrideInput
                      tld={tld}
                      type="renewal"
                      defaultValue={config.renewal.default}
                      value={config.renewal.by_tld[tld]}
                      onChange={(val) => handleTldOverrideChange('renewal', tld, val)}
                    />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <TldOverrideInput
                      tld={tld}
                      type="transfer"
                      defaultValue={config.transfer.default}
                      value={config.transfer.by_tld[tld]}
                      onChange={(val) => handleTldOverrideChange('transfer', tld, val)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProductCard>

      {/* ── Save / Reset Footer ────────────────────────────────────────── */}
      <div style={{
        paddingTop: 16,
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Configures markup rates for {SUPPORTED_TLDS.length} extensions &amp; services
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-professional-outline-sm"
            onClick={loadConfig}
            disabled={saving}
          >
            Reset
          </button>
          <button
            type="button"
            className="btn-professional-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Commission Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
