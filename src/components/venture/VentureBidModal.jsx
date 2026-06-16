import { useEffect, useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { venturePitchAPI } from '../../api/services';
import { resolveSellerAskSummary, formatVentureAskingPrice } from '../../utils/ventureListingHelpers';
import { resolveOwnershipLiquidationPercent, formatOwnershipLiquidationPercent } from '../../utils/ventureListingHelpers';
import { formatEquityOfferedPct } from '../../constants/ventureLabels';

export default function VentureBidModal({ venture, onClose, onSubmitted }) {
  const { formatPrice } = useCurrency();
  const brand = venture?.brandDetails || venture?.brand_details || {};
  const sellerAsk = resolveSellerAskSummary(venture);
  const maxEquity = resolveOwnershipLiquidationPercent(venture) ?? 100;

  const [equityPercent, setEquityPercent] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showExisting, setShowExisting] = useState(false);
  const [existingBids, setExistingBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);

  useEffect(() => {
    if (!showExisting || !venture?.id) return;
    setLoadingBids(true);
    venturePitchAPI.getPublicBids(venture.id)
      .then((res) => setExistingBids(Array.isArray(res.data) ? res.data : []))
      .catch(() => setExistingBids([]))
      .finally(() => setLoadingBids(false));
  }, [showExisting, venture?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amount = Number(bidAmount);
    const equity = Number(equityPercent);
    if (!amount || amount <= 0) {
      setError('Enter a valid bid amount.');
      return;
    }
    if (!equity || equity <= 0 || equity > 100) {
      setError('Equity requested must be between 0.01 and 100.');
      return;
    }
    if (equity > maxEquity) {
      setError(`Equity requested cannot exceed ownership liquidation (${formatEquityOfferedPct(maxEquity)}).`);
      return;
    }
    if (!message.trim()) {
      setError('Message is required.');
      return;
    }
    setSubmitting(true);
    try {
      await venturePitchAPI.submit(venture.id, {
        offeredAmount: amount,
        requestedEquityPercent: equity,
        message: message.trim(),
        additionalNotes: notes.trim() || null,
      });
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      setError(
        err.response?.data?.error
        || err.response?.data?.message
        || 'Could not submit bid.',
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
            <h2 className="font-display text-xl font-bold text-gray-900 m-0">Submit Bid</h2>
            <p className="text-sm text-gray-600 mt-1">
              {brand.brandName || brand.brand_name || 'Venture'}
            </p>
          </div>
          <button type="button" className="text-gray-400 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>

        {(sellerAsk.price || sellerAsk.equityLabel) && (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-800 mb-2">Seller is offering</div>
            <div className="flex flex-wrap gap-3 text-sm text-emerald-900">
              {sellerAsk.price ? (
                <span><strong>Asking price:</strong> {formatVentureAskingPrice(sellerAsk.price, formatPrice)}</span>
              ) : null}
              {sellerAsk.equityLabel ? (
                <span><strong>Ownership liquidation:</strong> {sellerAsk.equityLabel}</span>
              ) : null}
            </div>
          </div>
        )}

        {showExisting ? (
          <div className="mb-4 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 m-0">Existing Bids</h3>
              <button type="button" className="text-xs text-indigo-600" onClick={() => setShowExisting(false)}>
                Back to bid form
              </button>
            </div>
            {loadingBids ? (
              <p className="text-sm text-gray-500">Loading bids…</p>
            ) : existingBids.length === 0 ? (
              <p className="text-sm text-gray-500">No bids yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {existingBids.map((bid, index) => (
                  <div key={`${bid.createdAt}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                    <div><strong>Equity:</strong> {bid.equityPercent ?? bid.requestedEquityPercent}%</div>
                    <div><strong>Bid amount:</strong> {formatPrice(bid.bidAmount ?? bid.offeredAmount ?? 0)}</div>
                    <div className="text-xs text-gray-500">{bid.createdAt ? new Date(bid.createdAt).toLocaleString() : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Equity Requested (%)</span>
              <input
                type="number"
                min="0.01"
                max={maxEquity}
                step="0.01"
                value={equityPercent}
                onChange={(e) => setEquityPercent(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                required
              />
              <span className="text-xs text-gray-500">
                Maximum available: {formatOwnershipLiquidationPercent(venture) || `${maxEquity}%`}
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Bid Amount</span>
              <input
                type="number"
                min="1"
                step="1"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Message</span>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 resize-y"
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

            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button type="button" className="btn-glow btn-glow-sm" onClick={() => setShowExisting(true)}>
                View Existing Bids
              </button>
              <button type="button" className="btn-glow btn-glow-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-glow btn-glow-sm bg-gray-900 text-white border-gray-900" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Bid'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
