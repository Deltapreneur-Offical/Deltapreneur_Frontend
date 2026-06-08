import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import coBrotherLogo from '../assets/Cobrother_logo.png';
import AuthRegionalSettings from '../components/common/AuthRegionalSettings';
import BotProtectionFields from '../components/common/BotProtectionFields';
import { useBotProtection } from '../hooks/useBotProtection';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', password: '', confirm: '', otpCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const {
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  } = useBotProtection();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLoginSuccess = async (data) => {
    const payload = data?.data ?? data;
    const accessToken = payload?.accessToken || payload?.token;
    const refreshToken = payload?.refreshToken;

    if (!accessToken) throw new Error('No access token in response');

    login({ accessToken, refreshToken }, null);
    const fetchedUser = await refreshUser();
    navigate(
      fetchedUser?.profileComplete ? '/' : '/complete-profile',
      { replace: true },
    );
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError(t('passwordsNoMatch'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('passwordMinLength'));
      return;
    }
    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await authAPI.sendRegisterOtp({
        email: form.email,
        password: form.password,
        ...getProtectionPayload(),
      });
      setStep(2);
      setInfo(`${t('otpSentTo')} ${form.email}`);
      resetProtection();
    } catch (err) {
      resetProtection();
      const status = err.response?.status;
      const body = err.response?.data;
      if (status === 409) {
        setError(body?.error || body?.message || t('emailAlreadyRegistered', 'This email is already registered. Sign in or use Forgot password.'));
      } else {
        setError(body?.error || body?.message || t('failedToSendOtp', 'Failed to send verification code.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authAPI.verifyRegisterOtp(
        form.email,
        form.otpCode,
        getProtectionPayload(),
      );
      await handleLoginSuccess(data);
    } catch (err) {
      resetProtection();
      const body = err.response?.data;
      setError(body?.error || body?.message || t('invalidOtp', 'Invalid verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }
    try {
      const { data } = await authAPI.resendRegisterOtp(form.email, getProtectionPayload());
      setInfo(data?.message || `${t('otpSentTo')} ${form.email}`);
      resetProtection();
    } catch (err) {
      resetProtection();
      const body = err.response?.data;
      setError(body?.error || body?.message || t('failedToSendOtp', 'Failed to send verification code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-gradient-to-b from-gray-50 to-indigo-50">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-purple/16 rounded-full blur-[80px] opacity-70 -top-[150px] -right-[100px]" />
        <div className="absolute w-[400px] h-[400px] bg-blue-500/12 rounded-full blur-[80px] opacity-70 -bottom-[100px] -left-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-white/92 p-10 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/60 backdrop-blur-xl">
        <AuthRegionalSettings />
        <div className="text-center mb-8">
          <img src={coBrotherLogo} alt="CoBrother" className="w-[100px] h-auto object-contain mx-auto mb-4 block" />
          <h1 className="font-display text-[2rem] font-semibold text-gray-900">{t('registerTitle')}</h1>
          <p className="text-gray-600 text-[0.95rem] mt-1.5">
            {step === 1
              ? t('registerSubtitle')
              : t('registerOtpSubtitle', 'Enter the verification code sent to your email.')}
          </p>
        </div>

        {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-400 text-sm mb-4">{error}</div>}
        {info && <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-[10px] text-emerald-700 text-sm mb-4">{info}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('emailLabel')}</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder={t('emailPlaceholder')} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('passwordLabel')}</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder={t('passwordPlaceholder')} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('confirmPasswordLabel')}</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder={t('confirmPasswordPlaceholder')} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]" />
            </div>
            <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
            <button type="submit" className="btn-glow w-full" disabled={loading || requiresTurnstile}>
              {loading ? <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /> : t('sendVerificationCode', 'Send Verification Code')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('otpLabel', 'Verification Code')}</label>
              <input
                name="otpCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={form.otpCode}
                onChange={handleChange}
                placeholder={t('otpPlaceholder', 'Enter 6-digit code')}
                required
                maxLength={6}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)] tracking-widest text-center text-lg"
              />
            </div>
            <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
            <button type="submit" className="btn-glow w-full" disabled={loading || requiresTurnstile}>
              {loading ? <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /> : t('verifyAndCreateAccount', 'Verify & Create Account')}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setStep(1);
                  setError('');
                  setInfo('');
                  setForm((prev) => ({ ...prev, otpCode: '' }));
                }}
              >
                {t('back', 'Back')}
              </button>
              <button
                type="button"
                className="text-purple-600 font-medium hover:underline"
                onClick={handleResendOtp}
                disabled={loading}
              >
                {t('resendCode', 'Resend code')}
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-2 justify-center mt-6 text-sm text-gray-500">
          <span>{t('alreadyHaveAccount')}</span>
          <Link to="/login" className="text-purple-600 font-medium hover:underline">{t('signIn')}</Link>
        </div>
      </div>
    </div>
  );
}
