import { useEffect, useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { venturePitchAPI } from '../../api/services';
import { resolveSellerAskSummary, formatVentureAskingPrice } from '../../utils/ventureListingHelpers';

export default function VentureBidModal({ venture, onClose, onSubmitted }) {
  const { formatPrice } = useCurrency();
  const brand = venture?.brandDetails || venture?.brand_details || {};
  const sellerAsk = resolveSellerAskSummary(venture);

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
      setError('Enter a valid offer amount.');
      return;
    }
    if (!equity || equity <= 0 || equity > 100) {
      setError('Equity requested must be between 0.01 and 100.');
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
        || 'Could not submit offer.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="relative w-full max-w-[560px] flex flex-col min-h-0 bg-white border border-gray-200 rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden animate-slideUp">
        {/* Subtle Header Gradient Background */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-indigo-50/80 to-blue-50/40 pointer-events-none" />
        
        <div className="relative z-10 flex items-start justify-between gap-4 px-6 sm:px-8 pt-7 pb-4 border-b border-indigo-100/50">
          <div>
            <div className="inline-flex items-center justify-center px-2.5 py-1 bg-indigo-100/60 text-indigo-700 text-xs font-bold rounded-md mb-3 tracking-wide">
              VENTURE OFFER
            </div>
            <h2 className="font-display text-2xl font-extrabold text-gray-900 tracking-tight m-0">Submit Offer</h2>
            <p className="text-sm font-medium text-gray-600 mt-1">
              for <span className="text-indigo-700 font-bold">{brand.brandName || brand.brand_name || 'Venture'}</span>
            </p>
          </div>
          <button type="button" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm transition-colors" onClick={onClose}>✕</button>
        </div>

        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 sm:px-8 py-6">
          {(sellerAsk.price || sellerAsk.equityLabel) && (
            <div className="mb-6 rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-800">Seller is offering</div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sellerAsk.price ? (
                  <div>
                    <div className="text-[0.65rem] font-bold uppercase text-gray-500 tracking-wide mb-1">Asking Price</div>
                    <div className="text-lg font-bold text-gray-900">{formatVentureAskingPrice(sellerAsk.price, formatPrice)}</div>
                  </div>
                ) : null}
                {sellerAsk.equityLabel ? (
                  <div>
                    <div className="text-[0.65rem] font-bold uppercase text-gray-500 tracking-wide mb-1">Ownership Liquidation</div>
                    <div className="text-lg font-bold text-gray-900">{sellerAsk.equityLabel}</div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {showExisting ? (
            <div className="mb-2">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-gray-900 m-0">Existing Offers</h3>
                <button type="button" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full" onClick={() => setShowExisting(false)}>
                  Back to offer form
                </button>
              </div>
              {loadingBids ? (
                <div className="flex items-center justify-center py-10 text-sm font-medium text-gray-400">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin mr-3" />
                  Loading offers…
                </div>
              ) : existingBids.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm font-medium text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  No offers yet. Be the first to offer!
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {existingBids.map((bid, index) => (
                    <div key={`${bid.createdAt}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-base font-extrabold text-gray-900 tracking-tight">{formatPrice(bid.bidAmount ?? bid.offeredAmount ?? 0)}</span>
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 self-start px-2 py-0.5 rounded-md">For {bid.equityPercent ?? bid.requestedEquityPercent}% Equity</span>
                      </div>
                      <div className="text-[11px] font-bold tracking-wide text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 shadow-sm">
                        {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form id="venture-bid-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-bold text-gray-900">Offer Amount <span className="text-red-400">*</span></span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] shadow-sm"
                    placeholder="e.g. 50000"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-bold text-gray-900">Equity Requested (%) <span className="text-red-400">*</span></span>
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={equityPercent}
                    onChange={(e) => setEquityPercent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] shadow-sm"
                    placeholder="e.g. 15.5"
                    required
                  />
                  <span className="text-[11px] font-medium text-gray-500 mt-1">Value between 0.01 and 100</span>
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-bold text-gray-900">Message <span className="text-red-400">*</span></span>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] shadow-sm resize-y"
                  placeholder="Explain why you are interested and your terms..."
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-bold text-gray-900">Additional Notes <span className="text-gray-400 font-medium">(optional)</span></span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] shadow-sm resize-y"
                  placeholder="Any other details..."
                />
              </label>

              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-sm font-medium">{error}</div>}
            </form>
          )}
        </div>

        <div className="relative z-20 flex-shrink-0 px-6 sm:px-8 py-5 border-t border-gray-100 bg-white/95 backdrop-blur-md flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          {!showExisting && (
            <button type="button" className="w-full sm:w-auto px-6 py-3 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors" onClick={() => setShowExisting(true)}>
              View Existing Offers
            </button>
          )}
          {!showExisting && (
            <button type="submit" form="venture-bid-form" className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.95rem] font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Offer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
