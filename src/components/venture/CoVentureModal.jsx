import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { coVentureAPI } from '../../api/services';

const STATUS_KEYS = {
  PENDING:  { textKey: 'coVentureStatusPending',  descKey: 'coVentureStatusPendingDesc',  color: '#c8a96e', bg: 'rgba(200,169,110,0.1)',  border: 'rgba(200,169,110,0.3)',  icon: '⏳' },
  APPROVED: { textKey: 'coVentureStatusApproved', descKey: 'coVentureStatusApprovedDesc', color: '#6ec896', bg: 'rgba(110,200,150,0.1)',  border: 'rgba(110,200,150,0.3)',  icon: '✓'  },
  REJECTED: { textKey: 'coVentureStatusRejected', descKey: 'coVentureStatusRejectedDesc', color: '#c86e6e', bg: 'rgba(200,110,110,0.1)',  border: 'rgba(200,110,110,0.3)',  icon: '✕'  },
};

export default function CoVentureModal({ venture, onClose, onApplied }) {
  const { t } = useTranslation();
  const [form, setForm]       = useState({ fullName: '', phone: '', location: '', gstNo: '', description: ''  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [existingStatus, setExistingStatus] = useState(null);

  useEffect(() => {
    if (!venture?.id) return;
    setChecking(true);
    coVentureAPI.checkApplied(venture.id)
      .then(({ data }) => {
        const payload = data?.data ?? data;
        if (payload?.applied) {
          setExistingStatus(payload.status || 'PENDING');
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [venture?.id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await coVentureAPI.apply(venture.id, form);
      setSuccess(true);
      onApplied?.(venture?.id);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      if (err.response?.status === 409 || msg.toLowerCase().includes('already')) {
        setExistingStatus('PENDING');
      } else {
        setError(msg || t('coVentureApplicationFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const b = venture?.brandDetails || {};
  const typeLabel = b.ventureType
    ?.replace('FIFTY_FIFTY','50:50').replace('SIXTY_FORTY','60:40')
    .replace('SEVENTY_THIRTY','70:30').replace('EIGHTY_TWENTY','80:20')
    .replace('NINETY_TEN','90:10').replace('NEGOTIABLE','Negotiable') || '';

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[580px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(17,24,39,0.14)] overflow-hidden animate-slideUp">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-50 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors duration-200 hover:text-gray-900" onClick={onClose}>✕</button>

        {checking && (
          <div className="relative z-10 p-12 text-center">
            <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('coVentureCheckingStatus')}</p>
          </div>
        )}

        {!checking && existingStatus && (
          <AlreadyApplied
            venture={venture}
            status={existingStatus}
            typeLabel={typeLabel}
            onClose={onClose}
          />
        )}

        {!checking && !existingStatus && success && (
          <div className="relative z-10 text-center p-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">✓</div>
            <h3 className="font-display text-xl font-bold text-gray-900 mb-3">{t('coVentureSubmittedTitle')}</h3>
            <p className="text-gray-600 mb-6">
              {t('coVentureSubmittedBody', { brand: b.brandName })}
            </p>
            <button className="btn-glow" onClick={onClose}>{t('done')}</button>
          </div>
        )}

        {!checking && !existingStatus && !success && (
          <>
            <div className="relative z-10 p-8 pb-6">
              <div className="inline-block px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-md mb-4">{t('coVentureApplicationBadge')}</div>
              <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight m-0 mb-2">{t('coVentureApplyTitle')} <span className="text-purple">{b.brandName}</span></h2>
              <p className="text-gray-600 font-semibold text-sm m-0 mb-6">{typeLabel}{typeLabel && b.industry ? ' · ' : ''}{b.industry?.replace(/_/g, ' ')}</p>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 px-8 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">{t('coVentureFullName')} <span className="text-red-400">*</span></label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder={t('coVentureNamePlaceholder')}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-900">{t('coVenturePhone')} <span className="text-red-400">*</span></label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder={t('coVenturePhonePlaceholder')}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    title={t('coVenturePhoneTitle')}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-900">{t('coVentureLocation')}</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder={t('coVentureLocationPlaceholder')}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">{t('coVentureGstOptional')}</label>
                <input
                  name="gstNo"
                  value={form.gstNo}
                  onChange={handleChange}
                  placeholder={t('coVentureGstPlaceholder')}
                  maxLength={15}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-900">{t('coVentureHowHelp')} <span className="text-red-400">*</span></label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder={t('coVentureDescriptionPlaceholder')}
                  rows={4}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 resize-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
                />
              </div>

              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-400 text-sm">{error}</div>}

              <button type="submit" className="btn-glow w-full" disabled={loading}>
                {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" /> : t('coVentureSubmitApplication')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function AlreadyApplied({ venture, status, typeLabel, onClose }) {
  const { t } = useTranslation();
  const s = STATUS_KEYS[status] || STATUS_KEYS.PENDING;
  const b = venture?.brandDetails || {};

  return (
    <div className="relative z-10 p-8">
      <div className="mb-6">
        <div className="inline-block px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-md mb-4">{t('coVentureApplicationBadge')}</div>
        <h2 className="font-display text-2xl font-bold text-gray-900 m-0 mb-2">{b.brandName}</h2>
        <p className="text-gray-600 font-semibold text-sm m-0">{typeLabel}{typeLabel && b.industry ? ' · ' : ''}{b.industry?.replace(/_/g, ' ')}</p>
      </div>

      <div
        className="flex items-start gap-4 p-4 rounded-[14px] mb-6"
        style={{
          backgroundColor: s.bg,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: s.border
        }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
        <div>
          <div className="font-semibold text-sm mb-1" style={{ color: s.color }}>{t(s.textKey)}</div>
          <div className="text-xs text-gray-600">{t(s.descKey)}</div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        {t('coVentureAlreadyApplied')}
      </p>

      <button className="btn-glow w-full" onClick={onClose}>
        {t('coVentureClose')}
      </button>
    </div>
  );
}
