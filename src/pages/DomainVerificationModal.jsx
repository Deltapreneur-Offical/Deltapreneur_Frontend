import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI, domainAPI } from '../api/services';
import { readApiError } from '../utils/apiError';

const ALL_METHODS = [
  {
    id: 'DNS',
    label: 'DNS TXT Record',
    icon: '🌐',
    descKey: 'domainVerifyDnsDesc',
    badgeKey: 'domainVerifyRecommended',
    badgeColor: '#6ec896',
  },
  {
    id: 'META_TAG',
    label: 'HTML Meta Tag / File',
    icon: '🏷',
    descKey: 'domainVerifyMetaDesc',
    badgeKey: 'domainVerifyFastest',
    badgeColor: '#c8a96e',
  },
  {
    id: 'WHOIS_EMAIL',
    label: 'WHOIS Email',
    icon: '📧',
    descKey: 'domainVerifyWhoisDesc',
    badgeKey: 'domainVerifyEasy',
    badgeColor: '#6eadc8',
  },
];

export default function DomainVerificationModal({ domain, onClose, onVerified, adminMode = false }) {
  const { t } = useTranslation();
  const [step, setStep]           = useState('choose');
  const [method, setMethod]       = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [otpCode, setOtpCode]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const envWhoisDisabled =
    import.meta.env.VITE_DOMAIN_VERIFICATION_DISABLE_WHOIS === 'true';
  const [whoisEmailEnabled, setWhoisEmailEnabled] = useState(
    !import.meta.env.PROD && !envWhoisDisabled,
  );
  const [checkResult, setCheckResult]   = useState(null);
  const [error, setError]         = useState('');

  const fullDomain = domain.domainName + domain.domainExtension;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await domainAPI.verifyOptions();
        if (!cancelled) {
          const apiEnabled = data?.whois_email_enabled === true;
          setWhoisEmailEnabled(apiEnabled && !envWhoisDisabled);
        }
      } catch {
        if (!cancelled) {
          setWhoisEmailEnabled(false);
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const methods = useMemo(() => {
    return ALL_METHODS.map(m => ({
      ...m,
      desc: t(m.descKey),
      badge: t(m.badgeKey),
      disabled: m.id === 'WHOIS_EMAIL' && !whoisEmailEnabled,
    })).filter(m => m.id !== 'WHOIS_EMAIL' || whoisEmailEnabled);
  }, [whoisEmailEnabled, t]);

  const handleInit = async (selectedMethod) => {
    if (selectedMethod === 'WHOIS_EMAIL' && !whoisEmailEnabled) {
      setError(t('domainVerifyWhoisDisabled'));
      return;
    }
    setLoading(true); setError('');
    try {
      const { data } = adminMode
        ? await adminAPI.domainVerifyInit(domain.id, selectedMethod)
        : await domainAPI.verifyInit(domain.id, selectedMethod);
      setMethod(selectedMethod);
      setInstructions({
        ...data,
        instructions: data?.instructions || (data?.message ? [data.message] : []),
      });
      setStep('instructions');
    } catch (err) {
      setError(readApiError(err, t('domainVerifyInitFailed')));
    } finally { setLoading(false); }
  };

  const handleCheck = async () => {
    setLoading(true); setError(''); setCheckResult(null);
    try {
      const token = method === 'WHOIS_EMAIL' ? otpCode : null;
      const { data } = adminMode
        ? await adminAPI.domainVerifyCheck(domain.id, token)
        : await domainAPI.verifyCheck(domain.id, token);
      setCheckResult(data);
      if (data?.success) {
        setStep('done');
        onVerified();
      } else {
        setCheckResult(data);
      }
    } catch (err) {
      setError(readApiError(err, t('domainVerifyCheckFailed')));
    } finally { setLoading(false); }
  };

  const activeMethod = ALL_METHODS.find(m => m.id === method);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-slideUp">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors duration-200 hover:text-gray-700" onClick={onClose}>✕</button>

        {step === 'choose' && (
          <>
            <div className="relative z-10 p-8 pb-6">
              <div className="inline-block px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full border border-purple-200 mb-3">{t('domainVerifyTitle')}</div>
              <h2 className="font-display text-2xl font-semibold text-gray-900 m-0 mb-2">{fullDomain}</h2>
              <p className="text-gray-500 text-sm">{t('domainVerifySubtitle')}</p>
            </div>

            {!whoisEmailEnabled && (
              <div className="relative z-10 px-8 pb-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                  {t('domainVerifyProductionHint')}
                </div>
              </div>
            )}

            <div className="relative z-10 px-8 pb-8 flex flex-col gap-3">
              {optionsLoading ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  <span className="inline-block w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mr-2" />
                  {t('domainVerifyLoadingOptions')}
                </div>
              ) : (
                methods.map(m => (
                  <div
                    key={m.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && !loading && !m.disabled && handleInit(m.id)}
                    onClick={() => !loading && !m.disabled && handleInit(m.id)}
                    className={`p-4 rounded-[10px] border border-gray-200 bg-gray-50 transition-all duration-150 ${
                      loading || m.disabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl">{m.icon}</span>
                      <span className="font-semibold text-gray-900 text-sm">{m.label}</span>
                      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded" style={{ color: m.badgeColor, background: `${m.badgeColor}18`, border: `1px solid ${m.badgeColor}33` }}>
                        {m.badge}
                      </span>
                    </div>
                    <p className="m-0 text-xs text-gray-500 pl-8">{m.desc}</p>
                  </div>
                ))
              )}
            </div>

            {error && <div className="px-8 pb-4"><div className="p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-600">{error}</div></div>}
            {loading && <div className="text-center text-gray-500 text-sm pb-6">
              <span className="inline-block w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mr-2" />
              {t('domainVerifyInitiating')}
            </div>}
          </>
        )}

        {step === 'instructions' && instructions && (
          <>
            <div className="relative z-10 p-8 pb-6">
              <div className="inline-block px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full border border-purple-200 mb-3">
                {activeMethod?.icon} {activeMethod?.label}
              </div>
              <h2 className="font-display text-2xl font-semibold text-gray-900 m-0">{t('domainVerifyFollowSteps')}</h2>
            </div>

            <div className="relative z-10 px-8 flex flex-col gap-2.5">
              {(instructions.instructions || []).map((line, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-[22px] h-[22px] rounded-full bg-purple-100 border border-purple-200 text-purple-600 text-xs font-bold flex-shrink-0 flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-xs text-gray-600 leading-relaxed">{line}</span>
                </div>
              ))}
            </div>

            {method === 'DNS' && (
              <div className="relative z-10 px-8 mb-5 mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('domainVerifyTxtValue')}</div>
                <CopyBox value={instructions.dns_record || ''} />
              </div>
            )}

            {method === 'META_TAG' && (
              <div className="relative z-10 px-8 mb-5 mt-4 flex flex-col gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('domainVerifyMetaTag')}</div>
                  <CopyBox value={instructions.meta_tag || ''} mono />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('domainVerifyOrFile')}</div>
                  <div className="text-sm text-gray-500 mb-1">
                    {t('domainVerifyFileAt')}{' '}
                    <code className="text-purple-600">{instructions.file_path}</code>
                  </div>
                  <CopyBox value={instructions.file_content || ''} />
                </div>
              </div>
            )}

            {method === 'WHOIS_EMAIL' && (
              <div className="relative z-10 px-8 mb-5 mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('domainVerifyEnterCode')}</div>
                <p className="text-sm text-gray-500 mb-3">{instructions.message}</p>
                <input
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.toUpperCase())}
                  placeholder={t('domainVerifyCodePlaceholder')}
                  maxLength={64}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors tracking-[0.3em] text-lg text-center"
                />
              </div>
            )}

            {checkResult && !checkResult.success && (
              <div className="relative z-10 px-8 mb-4">
                <div className="p-3.5 bg-red-500/8 border border-red-500/25 rounded-lg text-xs text-red-400">
                  {checkResult.message || t('domainVerifyNotYet')}
                </div>
              </div>
            )}

            {error && <div className="relative z-10 px-8 mb-4"><div className="p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-600">{error}</div></div>}

            <div className="relative z-10 px-8 pb-8 flex gap-3 mt-4">
              <button className="btn-glow flex-1 flex items-center justify-center gap-2" onClick={handleCheck} disabled={loading}>
                {loading
                  ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" /> {t('domainVerifyChecking')}</>
                  : method === 'WHOIS_EMAIL' ? t('domainVerifyVerifyCode') : t('domainVerifyCheck')}
              </button>
              <button className="btn-glow" onClick={() => { setStep('choose'); setCheckResult(null); setError(''); }}>
                ← {t('domainVerifyBack')}
              </button>
            </div>

            {method !== 'WHOIS_EMAIL' && (
              <p className="relative z-10 px-8 pb-8 text-xs text-gray-600 text-center">
                {method === 'DNS' ? t('domainVerifyDnsWait') : t('domainVerifyMetaWait')}
              </p>
            )}
          </>
        )}

        {step === 'done' && (
          <div className="relative z-10 p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-display text-[1.75rem] font-semibold mb-2">
              {t('domainVerifySuccessTitle')}
            </h2>
            <p className="text-gray-500 mb-6">
              <strong className="text-green-600">{fullDomain}</strong> {t('domainVerifySuccessBody')}
            </p>
            <button className="btn-glow w-full" onClick={onClose}>{t('domainVerifyDone')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyBox({ value, mono }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
      <code className={`flex-1 text-purple-600 break-all font-mono ${mono ? 'text-xs' : 'text-sm'}`}>
        {value}
      </code>
      <button onClick={handleCopy}
        className={`px-2.5 py-1.5 rounded-md cursor-pointer text-xs whitespace-nowrap transition-all duration-200 ${
          copied
            ? 'bg-green-100 border border-green-300 text-green-600'
            : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}>
        {copied ? t('domainVerifyCopied') : t('domainVerifyCopy')}
      </button>
    </div>
  );
}
