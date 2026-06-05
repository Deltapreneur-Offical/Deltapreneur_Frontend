import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { domainEnquiryAPI } from '../api/services';
import useCurrency from '../context/CurrencyContext';

export default function DomainEnquiryModal({ domain, user, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [form, setForm] = useState({
    fullName: `${user?.firstname || ''} ${user?.lastname || ''}`.trim(),
    email:    user?.email || '',
    phone:    user?.phoneNumber || '',
    message:  '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await domainEnquiryAPI.submit(domain.id, form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || t('domainEnquirySubmitFailed'));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[500px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden animate-slideUp">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors duration-200 hover:text-gray-700" onClick={onClose}>✕</button>

        <div className="relative z-10 p-8 pb-6">
          <div className="inline-block px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-md mb-4">{t('domainEnquiryBadge')}</div>
          <h2 className="font-display text-2xl font-bold text-gray-900 m-0 mb-2">{domain.domainName}{domain.domainExtension}</h2>
          <p className="text-gray-500 text-sm m-0 mb-6">{formatPrice(domain.askingPrice)} · {domain.pricingDemand}</p>
        </div>

        <div className="relative z-10 px-8 py-3.5 bg-purple-50 border border-purple-200 rounded-lg mx-8 mb-6 text-xs text-purple-700">
          {t('domainEnquiryHighValueNote')}
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 px-8 pb-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('domainEnquiryFullName')} <span className="text-red-500">*</span></label>
            <input value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder={t('domainEnquiryNamePlaceholder')} required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('domainEnquiryEmail')} <span className="text-red-500">*</span></label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t('domainEnquiryEmailPlaceholder')} required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('domainEnquiryPhone')} <span className="text-red-500">*</span></label>
              <input value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder={t('domainEnquiryPhonePlaceholder')} maxLength={10} required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('domainEnquiryMessage')} <span className="text-red-500">*</span></label>
            <textarea value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={t('domainEnquiryMessagePlaceholder')}
              rows={4} required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 resize-y focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
          </div>

          {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-400 text-sm">{error}</div>}

          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={loading}
              className="btn-glow flex-1 flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" /> : t('domainEnquirySubmit')}
            </button>
            <button type="button" onClick={onClose}
              className="btn-glow">{t('cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
