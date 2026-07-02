import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '../../api/services';

/**
 * All editable fee keys persisted via GET/PUT /api/v1/auction-fees/listing-fees-and-charges.
 */
const EDITABLE_KEYS = [
  'listingCommissionPercent',
  'auctionCreationFeeInr',
  'auctionBidFeeInr',
  'communityParticipationFeeInr',
  'ventureAcquisitionCommissionPercent',
];

/**
 * Platform-wide auction fees — displayed once at the top, not repeated per product.
 */
const PLATFORM_AUCTION_FIELDS = [
  {
    key: 'auctionCreationFeeInr',
    label: 'Auction creation fee (INR)',
    hint: 'One-time fee paid by the seller when publishing an auction. Applies to Domain, Technology, and Creator auctions.',
  },
  {
    key: 'auctionBidFeeInr',
    label: 'Auction bid fee (INR)',
    hint: 'Charged to the bidder each time they place a bid. Applies to all auction types.',
  },
];

/**
 * Product sections — only show fees that are UNIQUE to that product.
 * Platform auction fees are NOT repeated here.
 */
const PRODUCT_SECTIONS = [
  {
    id: 'marketplace',
    icon: '🏷️',
    title: 'Marketplace listing commission',
    description:
      "Percentage markup on the seller's asking price for fixed-price listings. The buyer sees the final price including commission.",
    usageNote: null,
    appliesTo: [
      'Domains — buy-now / marketplace listings (DomainsPage)',
      'Technology — Co-Creation fixed-price listings (CoCreationPage)',
    ],
    fields: [
      {
        key: 'listingCommissionPercent',
        label: 'Listing commission (%)',
        hint: 'Not used for venture acquisition listings (see Ventures below).',
      },
    ],
  },
  {
    id: 'domains',
    icon: '🌐',
    title: 'Domains',
    description:
      'Domain buy-now listings use the marketplace commission. Domain auctions use the platform-wide creation and bid fees above — there are no separate domain-specific fees.',
    usageNote: 'Uses platform auction fees only — no unique domain fees.',
    appliesTo: [
      'Seller lists auction → creation fee (DomainsPage, AuctionPage)',
      'Bidder places each bid → bid fee (AuctionPage)',
    ],
    fields: [],
  },
  {
    id: 'technology',
    icon: '⚙️',
    title: 'Technology (Co-Creation)',
    description:
      'Fixed-price listings use marketplace commission. Software auctions use the platform-wide creation and bid fees above — there are no separate technology-specific fees.',
    usageNote: 'Uses platform auction fees only — no unique technology fees.',
    appliesTo: [
      'Seller requests auction → creation fee (SoftwareAuctionRequestModal)',
      'Bidder places each bid → bid fee (SoftwareAuctionPage)',
    ],
    fields: [],
  },
  {
    id: 'creator',
    icon: '✨',
    title: 'Creator (Community)',
    description:
      'Creator profile auctions use platform-wide creation and bid fees. The fee below is specific to Creator — it applies only when a company requests a meeting on a creator auction page.',
    usageNote: 'Also uses platform auction fees for auction creation and bidding.',
    appliesTo: [
      'Seller starts auction → creation fee (CommunityPage)',
      'Bidder places each bid → bid fee (CommunityAuctionPage)',
      'Bidder requests a meeting → meeting request fee (CommunityAuctionPage)',
    ],
    fields: [
      {
        key: 'communityParticipationFeeInr',
        label: 'Meeting request fee (INR)',
        hint: 'One-time fee to request a meeting on a creator auction. Not charged for placing bids.',
      },
    ],
  },
  {
    id: 'ventures',
    icon: '🚀',
    title: 'Ventures',
    description:
      'Acquisition and equity sale listings. Co-venture (partnership) listings have no platform fees at selection.',
    usageNote: null,
    appliesTo: [
      'Venture listing form → commission deducted from seller asking price (VentureForm)',
      'Venture deal checkout → same rate applied on deal completion',
    ],
    fields: [
      {
        key: 'ventureAcquisitionCommissionPercent',
        label: 'Acquisition commission (%)',
        hint: "Deducted from the seller's asking price (not added to buyer price).",
      },
    ],
  },
];

function normalizeFees(src = {}) {
  return Object.fromEntries(EDITABLE_KEYS.map((key) => [key, src[key] ?? '']));
}

function FeeInput({ fieldKey, label, hint, value, onChange }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <label htmlFor={`fee-${fieldKey}`} className="block text-xs font-semibold text-gray-800 mb-1">
        {label}
      </label>
      {hint && (
        <p className="text-[0.65rem] text-gray-400 mb-2 m-0 leading-snug">{hint}</p>
      )}
      <input
        id={`fee-${fieldKey}`}
        type="number"
        min="0"
        step="any"
        value={value ?? ''}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-gray-50/50 focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none"
      />
    </div>
  );
}

function PlatformFeeChip() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#4338ca',
        background: '#eef2ff',
        border: '1px solid #c7d2fe',
        borderRadius: '9999px',
        padding: '0.2rem 0.55rem',
        marginTop: '0.5rem',
      }}
    >
      <span aria-hidden>🔨</span> Uses platform auction fees
    </span>
  );
}

export default function AdminFeesAndChargesTab() {
  const { t } = useTranslation();
  const [fees, setFees] = useState(() => normalizeFees());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadFees = useCallback(() => {
    setLoading(true);
    return adminAPI.getListingFeesAndCharges()
      .then(({ data }) => {
        const src = data?.data ?? data ?? {};
        setFees(normalizeFees(src));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const handleFieldChange = (key, value) => {
    setFees((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        EDITABLE_KEYS.map((key) => [key, Number(fees[key])]),
      );
      const { data } = await adminAPI.updateListingFeesAndCharges(payload);
      const saved = data?.data ?? data ?? {};
      setFees(normalizeFees(saved));
      alert(t('adminFeesUpdated', 'Fees updated.'));
    } catch (e) {
      alert(e?.response?.data?.error || t('adminFeesUpdateFailed', 'Failed to update fees.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 py-8 text-center">Loading fees…</p>;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Page header */}
      <div className="px-5 sm:px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
        <h3 className="font-display text-xl font-bold text-gray-900 m-0 mb-1">Fees &amp; Charges</h3>
        <p className="text-sm text-gray-600 m-0 max-w-3xl">
          Configure fees by product line. Platform-wide auction fees apply to all auction types and are set once below.
        </p>
      </div>

      <div className="p-5 sm:p-6 flex flex-col gap-6">

        {/* ── Platform-wide auction fees ── shown ONCE, at the top */}
        <section
          style={{
            border: '1.5px solid #c7d2fe',
            borderRadius: '0.875rem',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%)',
          }}
        >
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderBottom: '1px solid #ddd6fe',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} aria-hidden>🔨</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h4 className="font-semibold text-gray-900 m-0">Auction fees</h4>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: '#4338ca',
                    background: '#e0e7ff',
                    border: '1px solid #c7d2fe',
                    borderRadius: '9999px',
                    padding: '0.1rem 0.45rem',
                  }}
                >
                  Platform-wide
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 m-0 leading-relaxed">
                Shared across <strong>all</strong> auction types — domain, technology, and creator.
                Sellers pay the creation fee once when publishing; bidders pay the bid fee on every bid.
              </p>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PLATFORM_AUCTION_FIELDS.map(({ key, label, hint }) => (
                <FeeInput
                  key={key}
                  fieldKey={key}
                  label={label}
                  hint={hint}
                  value={fees[key]}
                  onChange={handleFieldChange}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Product-specific sections ── */}
        {PRODUCT_SECTIONS.map((section) => {
          const hasUniqueFields = section.fields.length > 0;

          return (
            <section
              key={section.id}
              className="rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Section header */}
              <div className="px-4 py-3 sm:px-5 bg-gray-50/80 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5" aria-hidden>{section.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 m-0">{section.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 m-0 leading-relaxed">{section.description}</p>
                    {section.appliesTo?.length > 0 && (
                      <ul className="mt-2 mb-0 pl-4 text-[0.7rem] text-gray-500 space-y-0.5 list-disc">
                        {section.appliesTo.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                    {section.usageNote && <PlatformFeeChip />}
                  </div>
                </div>
              </div>

              {/* Section body — only if there are unique editable fields */}
              {hasUniqueFields && (
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.fields.map(({ key, label, hint }) => (
                      <FeeInput
                        key={key}
                        fieldKey={key}
                        label={label}
                        hint={hint}
                        value={fees[key]}
                        onChange={handleFieldChange}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* If no unique fields — compact info note */}
              {!hasUniqueFields && (
                <div className="px-4 sm:px-5 py-3">
                  <p className="text-xs text-gray-400 m-0 italic">
                    No unique fees for this product line. All auction fees are configured in the platform-wide section above.
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Footer with save */}
      <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 m-0">
          {EDITABLE_KEYS.length} active fee settings
        </p>
        <button type="button" className="btn-glow btn-glow-sm" onClick={handleSave} disabled={saving}>
          {saving ? t('adminSaving', 'Saving…') : t('adminSaveFees', 'Save fees')}
        </button>
      </div>
    </div>
  );
}
