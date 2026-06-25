import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatEquityOfferedPct } from '../../constants/ventureLabels';
import { coVentureAPI } from '../../api/services';

const STATUS_KEYS = {
  PENDING:  { textKey: 'coVentureStatusPending',  descKey: 'coVentureStatusPendingDesc',  color: '#c8a96e', bg: 'rgba(200,169,110,0.1)',  border: 'rgba(200,169,110,0.3)',  icon: '⏳' },
  APPROVED: { textKey: 'coVentureStatusApproved', descKey: 'coVentureStatusApprovedDesc', color: '#6ea8c8', bg: 'rgba(110,168,200,0.1)',  border: 'rgba(110,168,200,0.3)',  icon: '★'  },
  SELECTED: { textKey: 'coVentureStatusSelected', descKey: 'coVentureStatusSelectedDesc', color: '#6ec896', bg: 'rgba(110,200,150,0.1)',  border: 'rgba(110,200,150,0.3)',  icon: '🤝' },
  REJECTED: { textKey: 'coVentureStatusRejected', descKey: 'coVentureStatusRejectedDesc', color: '#c86e6e', bg: 'rgba(200,110,110,0.1)',  border: 'rgba(200,110,110,0.3)',  icon: '✕'  },
};

const PARTNER_PROFILE_FIELDS = [
  { name: 'experienceSummary', label: 'Experience Summary', type: 'textarea', placeholder: 'Brief overview of your background and relevant experience…' },
  { name: 'relevantExperience', label: 'Relevant Experience', type: 'textarea', placeholder: 'Specific roles, industries, or ventures that qualify you…' },
  { name: 'skills', label: 'Skills', type: 'text', placeholder: 'e.g. Product, Growth, Engineering, Finance' },
  { name: 'contributionPlan', label: 'Contribution Plan', type: 'textarea', placeholder: 'What you will bring to the partnership — time, capital, expertise…' },
  { name: 'motivation', label: 'Motivation', type: 'textarea', placeholder: 'Why you want to join this venture…' },
  { name: 'previousVentures', label: 'Previous Ventures', type: 'textarea', placeholder: 'Past startups or projects you have built or co-founded…' },
  { name: 'linkedinUrl', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/…' },
  { name: 'portfolioUrl', label: 'Portfolio / Website', type: 'url', placeholder: 'https://…' },
  { name: 'videoIntroductionUrl', label: 'Video Introduction', type: 'url', placeholder: 'YouTube, Drive, Loom, Vimeo, or any valid URL' },
];

const fieldCls =
  'w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]';

export default function CoVentureModal({ venture, onClose, onApplied }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    fullName: '', phone: '', location: '', description: '',
    experienceSummary: '', relevantExperience: '', skills: '',
    contributionPlan: '', motivation: '', previousVentures: '',
    linkedinUrl: '', portfolioUrl: '', videoIntroductionUrl: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingStatus, setExistingStatus] = useState(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (validationErrors[e.target.name]) {
      setValidationErrors((prev) => ({ ...prev, [e.target.name]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const errors = {};
    if (!form.fullName.trim()) errors.fullName = true;
    if (!form.phone.trim() || !form.phone.match(/^[0-9]{10}$/)) errors.phone = true;
    if (!form.location.trim()) errors.location = true;
    if (!form.description.trim()) errors.description = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please fill in all mandatory fields correctly.');
      setLoading(false);
      return;
    }

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
  const equityLabel = formatEquityOfferedPct(
    venture?.equityPercentOffered ?? venture?.equity_percent_offered,
  );
  const typeLabel = equityLabel || '';

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[580px] h-[92dvh] sm:h-auto sm:max-h-[90vh] flex flex-col min-h-0 bg-white border border-gray-200 rounded-t-[18px] sm:rounded-[18px] shadow-[0_20px_60px_rgba(17,24,39,0.14)] overflow-hidden animate-slideUp">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-50 blur-3xl pointer-events-none" />
        <button
          type="button"
          className="absolute top-4 right-4 z-30 bg-white/90 border border-gray-200 rounded-full w-9 h-9 text-gray-500 hover:text-gray-900 shadow-sm"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {checking && (
          <div className="relative z-10 p-12 text-center">
            <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('coVentureCheckingStatus')}</p>
          </div>
        )}

        {!checking && existingStatus && (
          <div className="relative z-10 overflow-y-auto overscroll-contain">
            <AlreadyApplied
              venture={venture}
              status={existingStatus}
              typeLabel={typeLabel}
              onClose={onClose}
            />
          </div>
        )}

        {!checking && !existingStatus && success && (
          <div className="relative z-10 text-center p-8 overflow-y-auto">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">✓</div>
            <h3 className="font-display text-xl font-bold text-gray-900 mb-3">{t('coVentureSubmittedTitle')}</h3>
            <p className="text-gray-600 mb-6">
              {t('coVentureSubmittedBody', { brand: b.brandName })}
            </p>
            <button type="button" className="btn-glow" onClick={onClose}>{t('done')}</button>
          </div>
        )}

        {!checking && !existingStatus && !success && (
          <>
            <div className="relative z-10 flex-shrink-0 px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 bg-white/95">
              <div className="inline-block px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-md mb-3">
                {t('coVentureApplicationBadge')}
              </div>
              <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight m-0 mb-1 pr-10">
                {t('coVentureApplyTitle')} <span className="text-purple-700">{b.brandName}</span>
              </h2>
              <p className="text-gray-600 font-medium text-sm m-0">
                {typeLabel}{typeLabel && b.industry ? ' · ' : ''}{b.industry?.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 sm:px-8 py-5">
              <form id="co-venture-apply-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2" noValidate>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-900">
                  Tell the founder who you are and how you will contribute. Required fields are marked with *.
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-900">{t('coVentureFullName')} <span className="text-red-400">*</span></label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} placeholder={t('coVentureNamePlaceholder')} required className={`${fieldCls} ${validationErrors.fullName ? '!border-red-500 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-gray-900">{t('coVenturePhone')} <span className="text-red-400">*</span></label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder={t('coVenturePhonePlaceholder')} maxLength={10} pattern="[0-9]{10}" title={t('coVenturePhoneTitle')} required className={`${fieldCls} ${validationErrors.phone ? '!border-red-500 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-gray-900">{t('coVentureLocation')} <span className="text-red-400">*</span></label>
                    <input name="location" value={form.location} onChange={handleChange} placeholder={t('coVentureLocationPlaceholder')} required className={`${fieldCls} ${validationErrors.location ? '!border-red-500 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-900">Contribution Statement <span className="text-red-400">*</span></label>
                  <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe how you will contribute to this partnership…" rows={4} required className={`${fieldCls} resize-y min-h-[96px] ${validationErrors.description ? '!border-red-500 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`} />
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Partner Profile (optional)</p>
                  <div className="flex flex-col gap-4">
                    {PARTNER_PROFILE_FIELDS.map(({ name, label, type, placeholder }) => (
                      <div key={name} className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-900">{label}</label>
                        {type === 'textarea' ? (
                          <textarea name={name} value={form[name]} onChange={handleChange} placeholder={placeholder} rows={3} className={`${fieldCls} resize-y min-h-[80px]`} />
                        ) : (
                          <input name={name} type={type === 'url' ? 'url' : 'text'} value={form[name]} onChange={handleChange} placeholder={placeholder} className={fieldCls} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-600 text-sm">{error}</div>}
              </form>
            </div>

            <div className="relative z-20 flex-shrink-0 px-6 sm:px-8 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-sm">
              <button type="submit" form="co-venture-apply-form" className="btn-glow w-full" disabled={loading}>
                {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : 'Submit Partnership Application'}
              </button>
            </div>
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
    <div className="p-8">
      <div className="mb-6">
        <div className="inline-block px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-md mb-4">{t('coVentureApplicationBadge')}</div>
        <h2 className="font-display text-2xl font-bold text-gray-900 m-0 mb-2">{b.brandName}</h2>
        <p className="text-gray-600 font-semibold text-sm m-0">{typeLabel}{typeLabel && b.industry ? ' · ' : ''}{b.industry?.replace(/_/g, ' ')}</p>
      </div>

      <div
        className="flex items-start gap-4 p-4 rounded-[14px] mb-6"
        style={{ backgroundColor: s.bg, borderWidth: '1px', borderStyle: 'solid', borderColor: s.border }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
        <div>
          <div className="font-semibold text-sm mb-1" style={{ color: s.color }}>{t(s.textKey)}</div>
          <div className="text-xs text-gray-600">{t(s.descKey)}</div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">{t('coVentureAlreadyApplied')}</p>
      <button type="button" className="btn-glow w-full" onClick={onClose}>{t('coVentureClose')}</button>
    </div>
  );
}
