import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '../../api/services';
import { readApiError } from '../../utils/apiError';

const EDITABLE_KEYS = [
  'listingCommissionPercent',
  'softwareOnetimeCommissionPercent',
  'hardwareOnetimeCommissionPercent',
  'auctionCreationFeeInr',
  'auctionBidFeeInr',
  'communityParticipationFeeInr',
  'ventureAcquisitionCommissionPercent',
];

/* ─── Reusable input ─────────────────────────────────────────────────────── */
function FeeInput({ fieldKey, label, hint, value, onChange, prefix, suffix, highlight }) {
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
        transition: 'background 0.15s',
      }}
    >
      <label
        htmlFor={`fee-${fieldKey}`}
        style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}
      >
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{
            position: 'absolute', left: 10, fontSize: 13, color: '#6b7280', fontWeight: 600, pointerEvents: 'none',
          }}>
            {prefix}
          </span>
        )}
        <input
          id={`fee-${fieldKey}`}
          type="number"
          min="0"
          step="any"
          value={value ?? ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          style={{
            width: '100%',
            padding: `8px ${suffix ? 44 : 12}px 8px ${prefix ? 28 : 12}px`,
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
        {suffix && (
          <span style={{
            position: 'absolute', right: 10, fontSize: 11, color: '#9ca3af', fontWeight: 700, pointerEvents: 'none',
          }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p style={{ fontSize: 11, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{hint}</p>
      )}
    </div>
  );
}

/* ─── Product section card ───────────────────────────────────────────────── */
function ProductCard({ emoji, title, subtitle, accentColor, children }) {
  return (
    <section style={{
      borderRadius: 16,
      border: `1.5px solid ${accentColor}22`,
      background: '#fff',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Header strip */}
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
      {/* Body */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </section>
  );
}

/* ─── Fee row: read-only reference badge ────────────────────────────────── */
function SharedFeeBadge({ label, description }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 10,
      background: '#fff7ed',
      border: '1px dashed #fed7aa',
    }}>
      <span style={{ fontSize: 14, marginTop: 1 }}>🔗</span>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#c2410c' }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: '#c2410c', marginTop: 2, opacity: 0.8 }}>{description}</p>
      </div>
    </div>
  );
}

/* ─── Info row: non-editable explanation ────────────────────────────────── */
function InfoRow({ emoji, label, description, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 14px',
      borderRadius: 10,
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#374151' }}>{label}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#6b7280', marginTop: 2 }}>{description}</p>
        </div>
      </div>
      {value != null && (
        <span style={{
          fontSize: 12, fontWeight: 800, color: '#374151',
          background: '#e5e7eb', borderRadius: 8, padding: '3px 10px', whiteSpace: 'nowrap',
        }}>
          {value}
        </span>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function AdminFeesAndChargesTab({ toast } = {}) {
  const { t } = useTranslation();
  const notify = toast || {
    success: () => {},
    error: () => {},
  };
  const [fees, setFees] = useState(() => Object.fromEntries(EDITABLE_KEYS.map((k) => [k, ''])));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadFees = useCallback(() => {
    setLoading(true);
    return adminAPI
      .getListingFeesAndCharges()
      .then(({ data }) => {
        const src = data?.data ?? data ?? {};
        setFees(Object.fromEntries(EDITABLE_KEYS.map((key) => [key, src[key] ?? ''])));
        setDirty(false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFees(); }, [loadFees]);

  const handleFieldChange = (key, value) => {
    setFees((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(EDITABLE_KEYS.map((key) => [key, Number(fees[key])]));
      if (EDITABLE_KEYS.some((key) => !Number.isFinite(payload[key]))) {
        notify.error(t('adminFeesInvalidNumbers', 'All fee fields must be valid numbers.'));
        return;
      }
      const { data } = await adminAPI.updateListingFeesAndCharges(payload);
      const saved = data?.data ?? data ?? {};
      setFees(Object.fromEntries(EDITABLE_KEYS.map((key) => [key, saved[key] ?? fees[key] ?? ''])));
      setDirty(false);
      notify.success(
        t(
          'adminFeesUpdated',
          'Fees saved. Auction pages will use the new bid fee after you refresh or reopen them.',
        ),
      );
    } catch (e) {
      notify.error(readApiError(e, t('adminFeesUpdateFailed', 'Failed to update fees.')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ffedd5', borderTopColor: '#f97316', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Loading configuration…</p>
      </div>
    );
  }

  const fmt = (v, prefix = '') => (v !== '' && v != null ? `${prefix}${v}` : '—');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>Fees &amp; Charges</h3>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280', maxWidth: 600, lineHeight: 1.6 }}>
          All platform fees are listed below, grouped by product. Changes you make here apply
          immediately across the entire platform. Each section clearly shows <strong>who pays</strong> the
          fee and <strong>when</strong> it is charged.
        </p>
      </div>

      {/* ── 1. DOMAINS ──────────────────────────────────────────────────── */}
      <ProductCard
        emoji="🌐"
        title="Domains"
        subtitle="Buy-now domain listings on the marketplace (DomainsPage)"
        accentColor="#0ea5e9"
      >
        <FeeInput
          fieldKey="listingCommissionPercent"
          label="Marketplace Commission"
          hint="Deducted from the seller's payout when a buy-now domain sells. Example: if the listing price is ₹10,000 and commission is 15%, the seller receives ₹8,500. The buyer pays the listing price plus GST (for example ₹11,800 at 18% GST)."
          value={fees.listingCommissionPercent}
          onChange={handleFieldChange}
          suffix="%"
        />
        <InfoRow
          emoji="💡"
          label="Who pays this?"
          description="The seller pays this. It is deducted from their payout. The buyer is not shown this commission. The buyer pays the listing price plus applicable GST."
        />
        <SharedFeeBadge
          label="Auction fees also apply to Domain Auctions"
          description="If a domain is listed as an auction (not buy-now), the Auction Creation Fee and Bid Fee below apply instead of the commission above."
        />
      </ProductCard>

      {/* ── 2. VENTURES ─────────────────────────────────────────────────── */}
      <ProductCard
        emoji="🚀"
        title="Ventures"
        subtitle="Venture acquisition deals and equity transfers (VenturesPage)"
        accentColor="#f97316"
      >
        <FeeInput
          fieldKey="ventureAcquisitionCommissionPercent"
          label="Acquisition Commission"
          hint="Deducted from the seller's payout when a venture deal is completed. Example: if a venture sells for ₹5,00,000 and commission is 10%, the seller receives ₹4,50,000."
          value={fees.ventureAcquisitionCommissionPercent}
          onChange={handleFieldChange}
          suffix="%"
        />
        <InfoRow
          emoji="💡"
          label="Who pays this?"
          description="The seller pays this. It is automatically deducted from the transaction payout at the time of deal completion."
        />
        <InfoRow
          emoji="ℹ️"
          label="Commission is NOT applied to"
          description="Regular venture listings on the marketplace. This commission only triggers when a formal acquisition/equity transfer deal is closed."
        />
      </ProductCard>

      {/* ── 3. TECHNOLOGY (Co-Creation) ─────────────────────────────────── */}
      <ProductCard
        emoji="💻"
        title="Technology / Co-Creation"
        subtitle="Software & hardware listings on the Co-Creation marketplace (CoCreationPage)"
        accentColor="#10b981"
      >
        <FeeInput
          fieldKey="softwareOnetimeCommissionPercent"
          label="Software / Technology Commission"
          hint="Independent of Domains. Deducted from the seller's payout on buy-now technology sales. Example: listing ₹10,000 at 15% → buyer pays ₹10,000; seller receives ₹8,500."
          value={fees.softwareOnetimeCommissionPercent}
          onChange={handleFieldChange}
          suffix="%"
        />
        <FeeInput
          fieldKey="hardwareOnetimeCommissionPercent"
          label="Hardware One-Time Commission"
          hint="Independent rate for one-time hardware buy-now listings. Deducted from the seller's payout; buyer pays the listed price only."
          value={fees.hardwareOnetimeCommissionPercent}
          onChange={handleFieldChange}
          suffix="%"
        />
        <SharedFeeBadge
          label="Auction fees also apply to Technology Auctions"
          description="If a technology item is listed as an auction (via SoftwareAuctionRequestModal), the Auction Creation Fee and Bid Fee below apply."
        />
        <InfoRow
          emoji="💡"
          label="Who pays this?"
          description="The seller pays technology commissions (deducted from payout). The buyer only sees and pays the listed price."
        />
      </ProductCard>

      {/* ── 4. CREATOR AUCTIONS ─────────────────────────────────────────── */}
      <ProductCard
        emoji="🎨"
        title="Deltapreneur Auctions"
        subtitle="Deltapreneurs listing themselves for acquisition or collaboration (CommunityPage → AuctionPage)"
        accentColor="#f59e0b"
      >
        <SharedFeeBadge
          label="Uses the platform-wide Auction Creation Fee and Bid Fee"
          description="Deltapreneur auctions share the same fee structure as all other auctions. Configure those amounts in the 'Platform-Wide Auction Fees' section below."
        />
        <FeeInput
          fieldKey="communityParticipationFeeInr"
          label="Meeting Request Fee"
          hint="A company pays this fee when requesting a 1-on-1 meeting or consultation with a Deltapreneur through their auction profile. This is separate from bidding — it covers the Deltapreneur's time for a scheduled meeting."
          value={fees.communityParticipationFeeInr}
          onChange={handleFieldChange}
          prefix="₹"
          suffix="INR"
        />
        <InfoRow
          emoji="💡"
          label="Who pays the Meeting Request Fee?"
          description="The company (requester) pays this fee upfront when submitting a meeting request. It does not affect the Deltapreneur's earnings from the auction itself."
        />
      </ProductCard>

      {/* ── 5. PLATFORM-WIDE AUCTION FEES ───────────────────────────────── */}
      <ProductCard
        emoji="🔨"
        title="Platform-Wide Auction Fees"
        subtitle="These apply to ALL auction types: Domain Auctions, Technology Auctions, and Deltapreneur Auctions"
        accentColor="#ef4444"
      >
        <div style={{
          padding: '10px 14px',
          borderRadius: 10,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          fontSize: 12,
          color: '#991b1b',
          marginBottom: 4,
          lineHeight: 1.6,
        }}>
          ⚠️ <strong>Important:</strong> Changing these fees affects <em>every</em> auction category simultaneously
          — Domains, Technology, and Deltapreneur auctions all use the same values set here.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <FeeInput
            fieldKey="auctionCreationFeeInr"
            label="Auction Creation Fee"
            hint="One-time fee paid by the SELLER when they publish/list a new auction. Charged once per auction, regardless of outcome."
            value={fees.auctionCreationFeeInr}
            onChange={handleFieldChange}
            prefix="₹"
            suffix="INR"
            highlight
          />
          <FeeInput
            fieldKey="auctionBidFeeInr"
            label="Bid Placement Fee"
            hint="Fee paid by the BIDDER each time they place a bid on any active auction. Charged per bid, not per auction."
            value={fees.auctionBidFeeInr}
            onChange={handleFieldChange}
            prefix="₹"
            suffix="INR"
            highlight
          />
        </div>

        {/* Who pays what summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 4 }}>
          <InfoRow
            emoji="🧑‍💼"
            label="Seller pays"
            description="Auction Creation Fee — once, when they list the auction."
          />
          <InfoRow
            emoji="🙋"
            label="Bidder pays"
            description="Bid Placement Fee — every time they submit a bid."
          />
        </div>

        {/* Applies to list */}
        <div style={{
          padding: '10px 14px',
          borderRadius: 10,
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          fontSize: 12,
          color: '#166534',
          lineHeight: 1.8,
        }}>
          ✅ <strong>Applies to:</strong><br />
          • <strong>Domain Auctions</strong> — listed on DomainsPage / AuctionPage<br />
          • <strong>Technology Auctions</strong> — listed via SoftwareAuctionRequestModal<br />
          • <strong>Deltapreneur Auctions</strong> — listed on CommunityPage / CommunityAuctionPage
        </div>
      </ProductCard>

      {/* ── Summary strip ───────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: '#f9fafb',
        padding: '14px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
      }}>
        {[
          { label: 'Domains Commission', value: `${fmt(fees.listingCommissionPercent, '')}%`, color: '#0ea5e9' },
          { label: 'Technology Commission', value: `${fmt(fees.softwareOnetimeCommissionPercent, '')}%`, color: '#10b981' },
          { label: 'Venture Acquisition Commission', value: `${fmt(fees.ventureAcquisitionCommissionPercent, '')}%`, color: '#f97316' },
          { label: 'Auction Creation Fee', value: fmt(fees.auctionCreationFeeInr, '₹'), color: '#ef4444' },
          { label: 'Bid Placement Fee', value: fmt(fees.auctionBidFeeInr, '₹'), color: '#ef4444' },
          { label: 'Meeting Request Fee', value: fmt(fees.communityParticipationFeeInr, '₹'), color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color }}>{value}</p>
            <p style={{ margin: 0, fontSize: 10, color: '#6b7280', marginTop: 3, lineHeight: 1.4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Footer / Save ────────────────────────────────────────────────── */}
      <div style={{
        paddingTop: 16,
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: dirty ? '#b45309' : '#9ca3af', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {dirty
            ? t('adminFeesUnsaved', 'Unsaved changes — click Save All Fees')
            : `${EDITABLE_KEYS.length} configurable fees`}
        </p>
        <button
          type="button"
          className="btn-professional-sm"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? t('adminSaving', 'Saving…') : t('adminSaveFees', 'Save All Fees')}
        </button>
      </div>
    </div>
  );
}
