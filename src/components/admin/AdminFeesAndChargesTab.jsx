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
    id: 'domains',
    icon: '🌐',
    title: 'Domains',
    description: 'Domain-specific auction fee. Domain buy-now listings use the marketplace commission above.',
    appliesTo: [
      'Domain auction page — pay before joining an active auction (AuctionPage)',
    ],
    fields: [
      {
        key: 'domainParticipationFeeInr',
        label: 'Auction participation fee (INR)',
      },
    ],
    sharedAuctionFees: true,
  },
  {
    id: 'technology',
    icon: '⚙️',
    title: 'Technology (Co-Creation)',
    description: 'Software / technology product line. Fixed-price listings use marketplace commission; auctions use fees below.',
    appliesTo: [
      'Software auction page — pay before joining (SoftwareAuctionPage)',
      'Software auction request — creation fee when requesting an auction (SoftwareAuctionRequestModal)',
    ],
    fields: [
      {
        key: 'softwareParticipationFeeInr',
        label: 'Auction participation fee (INR)',
      },
    ],
    sharedAuctionFees: true,
  },
  {
    id: 'creator',
    icon: '✨',
    title: 'Creator (Community)',
    description: 'Creator profile auctions where companies bid to collaborate.',
    appliesTo: [
      'Community page — creation fee when starting a creator auction (CommunityPage)',
      'Creator auction page — participation + per-bid fees (CommunityAuctionPage)',
    ],
    fields: [
      {
        key: 'communityParticipationFeeInr',
        label: 'Auction participation fee (INR)',
      },
    ],
    sharedAuctionFees: true,
  },
  {
    id: 'ventures',
    icon: '🚀',
    title: 'Ventures',
    description: 'Acquisition & equity sale listings. Co-venture (partnership) listings have no platform fees at selection.',
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
  {
    id: 'auction-shared',
    icon: '🔨',
    title: 'Auction fees (platform-wide)',
    description:
      'Single values shared across all active auction types. Changing these affects domain, software, and creator auctions.',
    appliesTo: [
      'Creation fee — Domain auctions (DomainsPage, AuctionPage), Software auctions (SoftwareAuctionRequestModal), Creator auctions (CommunityPage, CommunityAuctionPage)',
      'Bid fee — charged on each bid: Domain (AuctionPage), Software (SoftwareAuctionPage), Creator (CommunityAuctionPage)',
    ],
    fields: [
      {
        key: 'auctionCreationFeeInr',
        label: 'Auction creation fee (INR)',
        hint: 'One-time fee to publish an auction.',
      },
      {
        key: 'auctionBidFeeInr',
        label: 'Auction bid fee (INR)',
        hint: 'Paid each time a user places a bid.',
      },
    ],
  },
];

const ALL_KEYS = FEE_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

function normalizeFees(src = {}) {
  return Object.fromEntries(ALL_KEYS.map((key) => [key, src[key] ?? '']));
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
        ALL_KEYS.map((key) => [key, Number(fees[key])]),
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
          Configure fees by product line. Values marked platform-wide apply to every auction type that uses them.
        </p>
      </div>

      <div className="p-5 sm:p-6 flex flex-col gap-6">
        {FEE_SECTIONS.map((section) => (
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
                  {section.sharedAuctionFees && (
                    <p className="text-[0.7rem] text-indigo-600 mt-2 mb-0">
                      Also uses platform-wide auction creation &amp; bid fees (see Auction fees section).
                    </p>
                  )}
                  {section.inactiveNote && (
                    <p className="text-[0.7rem] text-amber-700 mt-2 mb-0">{section.inactiveNote}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.fields.map(({ key, label, hint }) => (
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
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 m-0">
          {ALL_KEYS.length} active fee settings
        </p>
        <button type="button" className="btn-glow btn-glow-sm" onClick={handleSave} disabled={saving}>
          {saving ? t('adminSaving', 'Saving…') : t('adminSaveFees', 'Save fees')}
        </button>
      </div>
    </div>
  );
}
