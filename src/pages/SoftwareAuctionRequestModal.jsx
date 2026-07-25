import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { softwareAuctionAPI } from '../api/services';
import useCurrency from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { fetchListingFeesAndCharges, payAuctionCreationFee } from '../utils/auctionFees';

const DURATIONS = ['ONE_DAY', 'THREE_DAYS', 'FIVE_DAYS', 'SEVEN_DAYS', 'FOURTEEN_DAYS', 'THIRTY_DAYS'];
const DURATION_KEYS = {
  ONE_DAY: 'softwareAuctionDuration1Day',
  THREE_DAYS: 'softwareAuctionDuration3Days',
  FIVE_DAYS: 'softwareAuctionDuration5Days',
  SEVEN_DAYS: 'softwareAuctionDuration7Days',
  FOURTEEN_DAYS: 'softwareAuctionDuration14Days',
  THIRTY_DAYS: 'softwareAuctionDuration30Days',
};

export default function SoftwareAuctionRequestModal({ software, onClose, onSubmitted }) {
  const { t } = useTranslation();
  const { formatPrice, getSymbol } = useCurrency();
  const { user } = useAuth();
  const [creationFeeInr, setCreationFeeInr] = useState(118);
  const [form, setForm] = useState({
    minBidPrice: '',
    duration: 'SEVEN_DAYS',
    auctionRationale: '',
    sourceCodeIncluded: false,
    supportIncluded: false,
    supportDays: 30,
    transferDetails: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const isAdmin = (user?.role ?? '').toString().toUpperCase() === 'ADMIN' || (user?.role ?? '').toString().toUpperCase() === 'ROLE_ADMIN';

  useEffect(() => {
    fetchListingFeesAndCharges()
      .then((fees) => setCreationFeeInr(Number(fees?.auctionCreationFeeInr ?? 118)))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.minBidPrice || parseFloat(form.minBidPrice) <= 0) {
      setError(t('softwareAuctionInvalidMinBid')); return;
    }
    if (!form.auctionRationale.trim()) {
      setError(t('softwareAuctionRationaleRequired')); return;
    }
    setError('');
    setLoading(true);
    try {
      let creationFeeOrderId = null;
      if (!isAdmin) {
        creationFeeOrderId = await payAuctionCreationFee({
          auctionType: 'SOFTWARE',
          user,
          referenceId: String(software.id),
          description: t('softwareAuctionCreationFee', { defaultValue: 'Software auction creation fee' }),
        });
      }
      await softwareAuctionAPI.create(software.id, {
        minBidPrice: parseFloat(form.minBidPrice),
        duration: form.duration,
        auctionRationale: form.auctionRationale,
        sourceCodeIncluded: form.sourceCodeIncluded,
        supportIncluded: form.supportIncluded,
        supportDays: form.supportIncluded ? parseInt(form.supportDays) : 0,
        transferDetails: form.transferDetails,
        creationFeeOrderId,
      });
      onSubmitted();
    } catch (e) {
      setError(e.response?.data || e.response?.data?.error || t('softwareAuctionSubmitFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-glow" />
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <div className="modal-badge">{t('softwareAuctionRequestBadge')}</div>
          <h2>{t('softwareAuctionRequestTitle', { name: software.name })}</h2>
          <p>{t('softwareAuctionRequestSubtitle')}</p>
        </div>

          <div style={{ padding: '0.875rem', background: 'rgba(110,173,200,0.08)',
                      border: '1px solid rgba(110,173,200,0.25)', borderRadius: 8,
                      marginBottom: '1.25rem', fontSize: '0.83rem', color: '#6eadc8' }}>
            {t('softwareAuctionRequestInfo')}
            <div style={{ marginTop: '0.5rem' }}>
              Auction creation fee: <strong>{isAdmin ? 'Free (Admin)' : formatPrice(creationFeeInr)}</strong> (charged before submission).
            </div>
          </div>

        <div className="flex flex-col gap-4 md:gap-5">

          <div className="form-group">
            <label className="block text-sm md:text-base font-semibold text-gray-800 mb-1.5 md:mb-2">{t('softwareAuctionMinBid', { symbol: getSymbol() })} <span className="text-red-500">*</span></label>
            <input type="number" min="1" value={form.minBidPrice}
              onChange={e => set('minBidPrice', e.target.value)}
              placeholder={t('softwareAuctionMinBidPlaceholder')}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm md:text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400 placeholder:font-normal" />
            <span className="text-xs md:text-sm text-gray-500 mt-1">
              {t('softwareAuctionCurrentListedPrice')}{' '}
              <span className="font-semibold text-gray-700">{formatPrice(software.price)}</span>
            </span>
          </div>

          <div className="form-group">
            <label className="block text-sm md:text-base font-semibold text-gray-800 mb-1.5 md:mb-2">{t('softwareAuctionDuration')} <span className="text-red-500">*</span></label>
            <select value={form.duration} onChange={e => set('duration', e.target.value)}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm md:text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer appearance-none">
              {DURATIONS.map(d => (
                <option key={d} value={d}>{t(DURATION_KEYS[d])}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="block text-sm md:text-base font-semibold text-gray-800 mb-1.5 md:mb-2">{t('softwareAuctionWhyAuction')} <span className="text-red-500">*</span></label>
            <textarea value={form.auctionRationale}
              onChange={e => set('auctionRationale', e.target.value)}
              placeholder={t('softwareAuctionRationalePlaceholder')}
              rows={3}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm md:text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y placeholder:text-gray-400 placeholder:font-normal" />
          </div>

          <div className="flex flex-col gap-2 md:gap-3">
            <label className="flex items-center gap-2 md:gap-3 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors">
              <input type="checkbox" checked={form.sourceCodeIncluded}
                onChange={e => set('sourceCodeIncluded', e.target.checked)}
                className="w-4 h-4 md:w-5 md:h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer accent-indigo-600" />
              <span className="font-medium">{t('softwareAuctionSourceCodeIncluded')}</span>
            </label>
            <label className="flex items-center gap-2 md:gap-3 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors">
              <input type="checkbox" checked={form.supportIncluded}
                onChange={e => set('supportIncluded', e.target.checked)}
                className="w-4 h-4 md:w-5 md:h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer accent-indigo-600" />
              <span className="font-medium">{t('softwareAuctionSupportIncluded')}</span>
            </label>
          </div>

          {form.supportIncluded && (
            <div className="form-group">
              <label className="block text-sm md:text-base font-semibold text-gray-800 mb-1.5 md:mb-2">{t('softwareAuctionSupportDays')}</label>
              <input type="number" min="1" max="365" value={form.supportDays}
                onChange={e => set('supportDays', e.target.value)}
                placeholder={t('softwareAuctionSupportDaysPlaceholder')}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm md:text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400 placeholder:font-normal" />
            </div>
          )}

          <div className="form-group">
            <label className="block text-sm md:text-base font-semibold text-gray-800 mb-1.5 md:mb-2">{t('softwareAuctionTransferDetails')}</label>
            <textarea value={form.transferDetails}
              onChange={e => set('transferDetails', e.target.value)}
              placeholder={t('softwareAuctionTransferPlaceholder')}
              rows={2}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm md:text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y placeholder:text-gray-400 placeholder:font-normal" />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
            <span className="mt-0.5">⚠</span> {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-6">
          <button className="btn-glow flex-1 order-2 sm:order-1" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="btn-spinner" /> : (isAdmin ? 'Create Auction' : `Pay ${formatPrice(creationFeeInr)} & Submit`)}
          </button>
          <button
            className="px-4 py-2.5 md:py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg transition-all hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 hover:text-white hover:shadow-lg order-1 sm:order-2"
            onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
