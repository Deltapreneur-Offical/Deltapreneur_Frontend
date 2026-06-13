import { useState } from 'react';
import { venturePitchAPI } from '../../api/services';
import { useCurrency } from '../../context/CurrencyContext';
import { resolveSellerAskSummary, formatVentureAskingPrice } from '../../utils/ventureListingHelpers';

/**
 * Investment pitch for EQUITY_SALE listings.
 * Canonical Pitch Offer Structure: Investor Offer (₹), Requested Equity (%),
 * Proposal, Additional Notes. Full-acquisition listings never use this modal
 * (Direct Buy → VentureBuyModal, Seller-Selected → VentureOfferModal).
 */
export default function VenturePitchModal({ venture, onClose, onSubmitted }) {
  const { formatPrice } = useCurrency();
  const brand = venture?.brandDetails || venture?.brand_details || {};
  const sellerAsk = resolveSellerAskSummary(venture);
  const [offeredAmount, setOfferedAmount] = useState('');
  const [equityPercent, setEquityPercent] = useState('');
  const [proposal, setProposal] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amount = Number(offeredAmount);
    const equity = Number(equityPercent);
    if (!amount || amount <= 0) {
      setError('Enter a valid investor offer amount.');
      return;
    }
    if (!equity || equity <= 0 || equity > 100) {
      setError('Requested equity must be between 0.01 and 100.');
      return;
    }
    if (!proposal.trim()) {
      setError('Proposal is required.');
      return;
    }
    setSubmitting(true);
    try {
      await venturePitchAPI.submit(venture.id, {
        offeredAmount: amount,
        requestedEquityPercent: equity,
        investmentProposal: proposal.trim(),
        additionalNotes: notes.trim() || null,
      });
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      setError(
        err.response?.data?.error
        || err.response?.data?.message
        || 'Could not submit pitch.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900 m-0">Submit Investment Pitch</h2>
            <p className="text-sm text-gray-600 mt-1">
              {brand.brandName || brand.brand_name || 'Venture'}
            </p>
          </div>
          <button type="button" className="text-gray-400 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>

        {(sellerAsk.price || sellerAsk.equityLabel) && (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-800 mb-2">Seller is asking</div>
            <div className="flex flex-wrap gap-3 text-sm text-emerald-900">
              {sellerAsk.price ? (
                <span><strong>Price:</strong> {formatVentureAskingPrice(sellerAsk.price, formatPrice)}</span>
              ) : null}
              {sellerAsk.equityLabel ? (
                <span><strong>Equity offered:</strong> {sellerAsk.equityLabel}</span>
              ) : null}
              {sellerAsk.dealTypeLabel ? (
                <span><strong>Deal type:</strong> {sellerAsk.dealTypeLabel}</span>
              ) : null}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Investor Offer (₹)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={offeredAmount}
              onChange={(e) => setOfferedAmount(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Requested Equity (%)</span>
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={equityPercent}
              onChange={(e) => setEquityPercent(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Proposal</span>
            <textarea
              rows={4}
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 resize-y"
              placeholder="Describe your offer, experience, and why you are a fit (at least a couple of sentences recommended)."
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Additional Notes <span className="text-gray-400 font-normal">(optional)</span></span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 resize-y"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-glow btn-glow-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-glow btn-glow-sm bg-gray-900 text-white border-gray-900" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Pitch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
