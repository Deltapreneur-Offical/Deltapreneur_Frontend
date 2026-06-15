import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import BotProtectionFields from '../components/common/BotProtectionFields';
import { useBotProtection } from '../hooks/useBotProtection';
import { resolveAfterAuthNavigation } from '../utils/authSession';
import { startGoogleOAuth } from '../utils/googleOAuth';
import AuthShell from '../components/auth/AuthShell';
import AuthMethodToggle from '../components/auth/AuthMethodToggle';
import AuthAlert from '../components/auth/AuthAlert';
import AuthPrimaryButton from '../components/auth/AuthPrimaryButton';
import AuthRecoverActions from '../components/auth/AuthRecoverActions';
import GoogleIcon from '../components/auth/GoogleIcon';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, refreshUser } = useAuth();
  const [authMethod, setAuthMethod] = useState('google');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', password: '', confirm: '', otpCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [emailConflict, setEmailConflict] = useState(false);
  const {
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  } = useBotProtection();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'email' && emailConflict) {
      setEmailConflict(false);
      setError('');
    }
  };

  const handleAuthMethodChange = (method) => {
    setAuthMethod(method);
    setEmailConflict(false);
    if (method === 'google') {
      setError('');
      setInfo('');
    }
  };

  const handleLoginSuccess = async (data) => {
    const payload = data?.data ?? data;
    const accessToken = payload?.accessToken || payload?.token;
    const refreshToken = payload?.refreshToken;

    if (!accessToken) throw new Error('No access token in response');

    login({ accessToken, refreshToken }, null);
    const fetchedUser = await refreshUser();
    const destination = resolveAfterAuthNavigation(null, fetchedUser);
    navigate(destination.pathname, { replace: true, state: destination.state });
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
    setEmailConflict(false);
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
        setEmailConflict(true);
        setError(t('emailAlreadyRegistered'));
      } else {
        setEmailConflict(false);
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

  const showMethodToggle = step === 1;

  return (
    <AuthShell
      title={t('registerTitle')}
      subtitle={
        step === 1
          ? t('registerSubtitle')
          : t('registerOtpSubtitle', 'Enter the verification code sent to your email.')
      }
      onBack={() => navigate('/')}
      footer={(
        <>
          <span>{t('alreadyHaveAccount')} </span>
          <Link to="/login">{t('signIn')}</Link>
        </>
      )}
    >
      {showMethodToggle && (
        <AuthMethodToggle
          value={authMethod}
          onChange={handleAuthMethodChange}
          googleLabel={t('authMethodGoogle')}
          emailLabel={t('authMethodEmail')}
        />
      )}

      <AuthAlert variant="error">{error}</AuthAlert>
      <AuthRecoverActions email={form.email} show={emailConflict} />
      <AuthAlert variant="info">{info}</AuthAlert>

      {authMethod === 'google' && step === 1 && (
        <div className="flex flex-col gap-3">
          <button type="button" className="btn-oauth" onClick={() => startGoogleOAuth()}>
            <GoogleIcon />
            {t('continueWithGoogle')}
          </button>
          <p className="auth-google-hint">{t('registerGoogleHint')}</p>
        </div>
      )}

      {authMethod === 'email' && step === 1 && (
        <form onSubmit={handleSendOtp} className="auth-form flex flex-col gap-4">
          <div className="auth-form-field">
            <label className="auth-form-label" htmlFor="register-email">{t('emailLabel')}</label>
            <input
              id="register-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('emailPlaceholder')}
              required
              className="auth-form-input"
            />
          </div>
          <div className="auth-form-field">
            <label className="auth-form-label" htmlFor="register-password">{t('passwordLabel')}</label>
            <input
              id="register-password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t('passwordPlaceholder')}
              required
              className="auth-form-input"
            />
          </div>
          <div className="auth-form-field">
            <label className="auth-form-label" htmlFor="register-confirm">{t('confirmPasswordLabel')}</label>
            <input
              id="register-confirm"
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={handleChange}
              placeholder={t('confirmPasswordPlaceholder')}
              required
              className="auth-form-input"
            />
          </div>
          <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
          <AuthPrimaryButton type="submit" busy={loading} disabled={requiresTurnstile}>
            {t('sendVerificationCode', 'Send Verification Code')}
          </AuthPrimaryButton>
        </form>
      )}

      {authMethod === 'email' && step === 2 && (
        <form onSubmit={handleVerifyOtp} className="auth-form flex flex-col gap-4">
          <div className="auth-form-field">
            <label className="auth-form-label" htmlFor="register-otp">{t('otpLabel', 'Verification Code')}</label>
            <input
              id="register-otp"
              name="otpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={form.otpCode}
              onChange={handleChange}
              placeholder={t('otpPlaceholder', 'Enter 6-digit code')}
              required
              maxLength={6}
              className="auth-form-input otp-input"
            />
          </div>
          <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
          <AuthPrimaryButton type="submit" busy={loading} disabled={requiresTurnstile}>
            {t('verifyAndCreateAccount', 'Verify & Create Account')}
          </AuthPrimaryButton>
          <div className="auth-form-links">
            <button
              type="button"
              className="auth-form-link-btn"
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
              className="auth-form-link-btn"
              onClick={handleResendOtp}
              disabled={loading}
            >
              {t('resendCode', 'Resend code')}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
