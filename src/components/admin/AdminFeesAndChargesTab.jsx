import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '../../api/services';

/**
 * Fee keys persisted via GET/PUT /api/v1/auction-fees/listing-fees-and-charges.
 * Grouped by product line based on actual frontend + backend usage (not assumed).
 */
const FEE_SECTIONS = [
  {
    id: 'marketplace',
    icon: '🏷️',
    title: 'Marketplace listing commission',
    description:
      'Percentage markup on the seller\'s asking price for fixed-price listings. The buyer sees the final price including commission.',
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
    id: 'auction-shared',
    icon: '🔨',
    title: 'Auction fees (platform-wide)',
    description:
      'Shared across domain, software, and creator auctions. Sellers pay the creation fee once when publishing; bidders pay the bid fee on every bid.',
    appliesTo: [
      'Creation fee — Domain (DomainsPage, AuctionPage), Software (SoftwareAuctionRequestModal), Creator (CommunityPage)',
      'Bid fee — charged on each bid: Domain (AuctionPage), Software (SoftwareAuctionPage), Creator (CommunityAuctionPage)',
    ],
    fields: [
      {
        key: 'auctionCreationFeeInr',
        label: 'Auction creation fee (INR)',
        hint: 'One-time fee paid by the seller when publishing an auction.',
      },
      {
        key: 'auctionBidFeeInr',
        label: 'Auction bid fee (INR)',
        hint: 'Paid by the bidder each time they place a bid.',
      },
    ],
  },
  {
    id: 'domains',
    icon: '🌐',
    title: 'Domains',
    description:
      'Domain buy-now listings use the marketplace commission above. Domain auctions use the platform-wide creation and bid fees — there is no separate domain bidder entry fee.',
    appliesTo: [
      'Seller lists auction — creation fee (DomainsPage, AuctionPage)',
      'Bidder places each bid — bid fee (AuctionPage)',
    ],
    readOnlyRefs: [
      { key: 'auctionCreationFeeInr', label: 'Creation fee (INR)' },
      { key: 'auctionBidFeeInr', label: 'Bid fee per bid (INR)' },
    ],
  },
  {
    id: 'technology',
    icon: '⚙️',
    title: 'Technology (Co-Creation)',
    description:
      'Fixed-price listings use marketplace commission. Software auctions use the platform-wide creation and bid fees — there is no separate software bidder entry fee.',
    appliesTo: [
      'Seller requests auction — creation fee (SoftwareAuctionRequestModal)',
      'Bidder places each bid — bid fee (SoftwareAuctionPage)',
    ],
    readOnlyRefs: [
      { key: 'auctionCreationFeeInr', label: 'Creation fee (INR)' },
      { key: 'auctionBidFeeInr', label: 'Bid fee per bid (INR)' },
    ],
  },
  {
    id: 'creator',
    icon: '✨',
    title: 'Creator (Community)',
    description:
      'Creator profile auctions use platform-wide creation and bid fees for listing and bidding. The fee below is separate — it applies only when a company requests a meeting on a creator auction page.',
    appliesTo: [
      'Seller starts auction — creation fee (CommunityPage)',
      'Bidder places each bid — bid fee (CommunityAuctionPage)',
      'Bidder requests a meeting — meeting request fee (CommunityAuctionPage)',
    ],
    fields: [
      {
        key: 'communityParticipationFeeInr',
        label: 'Meeting request fee (INR)',
        hint: 'One-time fee to request a meeting on a creator auction. Not charged for placing bids.',
      },
    ],
    readOnlyRefs: [
      { key: 'auctionCreationFeeInr', label: 'Creation fee (INR)' },
      { key: 'auctionBidFeeInr', label: 'Bid fee per bid (INR)' },
    ],
  },
  {
    id: 'ventures',
    icon: '🚀',
    title: 'Ventures',
    description: 'Acquisition and equity sale listings. Co-venture (partnership) listings have no platform fees at selection.',
    appliesTo: [
      'Venture listing form — commission deducted from seller asking price (VentureForm)',
      'Venture deal checkout — same rate applied on deal completion',
    ],
    fields: [
      {
        key: 'ventureAcquisitionCommissionPercent',
        label: 'Acquisition commission (%)',
        hint: 'Deducted from the seller\'s asking price (not added to buyer price).',
      },
    ],
  },
];

const EDITABLE_KEYS = FEE_SECTIONS.flatMap((s) => (s.fields ?? []).map((f) => f.key));

function normalizeFees(src = {}) {
  return Object.fromEntries(EDITABLE_KEYS.map((key) => [key, src[key] ?? '']));
}

function formatInr(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
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
      <div className="px-5 sm:px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
        <h3 className="font-display text-xl font-bold text-gray-900 m-0 mb-1">Fees &amp; Charges</h3>
        <p className="text-sm text-gray-600 m-0 max-w-3xl">
          Configure fees by product line. Auction creation and bid fees are set once and apply to every auction type.
        </p>
      </div>

      <div className="p-5 sm:p-6 flex flex-col gap-6">
        {FEE_SECTIONS.map((section) => {
          const editableFields = section.fields ?? [];
          const readOnlyRefs = section.readOnlyRefs ?? [];

          return (
            <section
              key={section.id}
              className="rounded-xl border border-gray-200 overflow-hidden"
            >
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
                    {section.inactiveNote && (
                      <p className="text-[0.7rem] text-amber-700 mt-2 mb-0">{section.inactiveNote}</p>
                    )}
                  </div>
                </div>
              </div>

              {(editableFields.length > 0 || readOnlyRefs.length > 0) && (
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {editableFields.map(({ key, label, hint }) => (
                      <div key={key} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                        <label htmlFor={`fee-${key}`} className="block text-xs font-semibold text-gray-800 mb-1">
                          {label}
                        </label>
                        {hint ? (
                          <p className="text-[0.65rem] text-gray-400 mb-2 m-0 leading-snug">{hint}</p>
                        ) : null}
                        <input
                          id={`fee-${key}`}
                          type="number"
                          min="0"
                          step="any"
                          value={fees[key] ?? ''}
                          onChange={(e) => setFees((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-gray-50/50 focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none"
                        />
                      </div>
                    ))}
                    {readOnlyRefs.map(({ key, label }) => (
                      <div
                        key={`ref-${key}`}
                        className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3"
                      >
                        <p className="text-xs font-semibold text-gray-700 m-0 mb-1">{label}</p>
                        <p className="text-[0.65rem] text-gray-400 m-0 mb-2 leading-snug">
                          Set in Auction fees (platform-wide) above.
                        </p>
                        <p className="text-sm font-semibold text-gray-900 m-0 tabular-nums">
                          {formatInr(fees[key])}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

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
