import { useState } from 'react';
import { venturePitchAPI } from '../../api/services';

/**
 * Acquisition offer for FULL_ACQUISITION listings with seller-selected offers
 * (acquisitionFlow = SELLER_SELECTS). Offer Amount (₹) + Message — no equity
 * percentage (full acquisition is always 100%). The seller reviews offers and
 * selects a buyer, which creates the deal and unlocks payment.
 */
export default function VentureOfferModal({ venture, onClose, onSubmitted }) {
  const brand = venture?.brandDetails || venture?.brand_details || {};
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid offer amount.');
      return;
    }
    if (!message.trim()) {
      setError('A message to the seller is required.');
      return;
    }
    setSubmitting(true);
    try {
      await venturePitchAPI.submit(venture.id, {
        offeredAmount: amount,
        requestedEquityPercent: 100,
        investmentProposal: message.trim(),
        additionalNotes: notes.trim() || null,
      });
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      setError(
        err.response?.data?.error
        || err.response?.data?.message
        || 'Could not submit offer.',
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
            <h2 className="font-display text-xl font-bold text-gray-900 m-0">Submit Acquisition Offer</h2>
            <p className="text-sm text-gray-600 mt-1">
              {brand.brandName || brand.brand_name || 'Venture'} — full acquisition (100%)
            </p>
          </div>
          <button type="button" className="text-gray-400 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          The seller reviews offers and selects a buyer. Payment is only requested
          after your offer is selected.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Offer Amount (₹)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Message to Seller</span>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 resize-y"
              placeholder="Introduce yourself and explain your offer."
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
              {submitting ? 'Submitting…' : 'Submit Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
