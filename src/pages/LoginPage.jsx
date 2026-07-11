import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { resolveAfterAuthNavigation } from '../utils/authSession';
import {
  startGoogleOAuth,
  startLinkedInOAuth,
} from '../utils/socialOAuth';
import { checkBackendDatabaseReady, DATABASE_UNAVAILABLE_HINT } from '../utils/backendReady';
import BotProtectionFields from '../components/common/BotProtectionFields';
import { useBotProtection } from '../hooks/useBotProtection';
import AuthShell from '../components/auth/AuthShell';
import AuthMethodToggle from '../components/auth/AuthMethodToggle';
import AuthAlert from '../components/auth/AuthAlert';
import AuthPrimaryButton from '../components/auth/AuthPrimaryButton';
import GoogleIcon from '../components/auth/GoogleIcon';
import LinkedInIcon from '../components/auth/LinkedInIcon';
import { readApiError } from '../utils/apiError';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, loading, login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from =
    location.state?.from ||
    localStorage.getItem('redirectAfterLogin') ||
    null;

  const showLoginForm = location.state?.showLoginForm === true;

  const [authMethod, setAuthMethod] = useState('google');
  const [mode, setMode] = useState('password');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', password: '', otpCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const {
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  } = useBotProtection();

  useEffect(() => {
    const prefilledEmail = location.state?.email;
    if (prefilledEmail && typeof prefilledEmail === 'string') {
      setForm((prev) => ({ ...prev, email: prefilledEmail }));
      setAuthMethod('email');
      setMode('password');
    }
  }, [location.state?.email]);

  useEffect(() => {
    if (!loading && user && !showLoginForm) {
      const destination = resolveAfterAuthNavigation(
        localStorage.getItem('redirectAfterLogin') || from,
        user,
      );
      navigate(destination.pathname, { replace: true, state: destination.state });
      localStorage.removeItem('redirectAfterLogin');
    }
  }, [user, loading, showLoginForm, navigate, from]);

  useEffect(() => {
    const err = searchParams.get('error');
    const oauthErrorMessages = {
      oauth_failed: t('googleSignInFailed'),
      oauth_profile: t('googleSignInFailed'),
      google_authentication_failed: t('googleSignInFailed'),
      oauth_token_exchange_failed: t(
        'googleTokenExchangeFailed',
        'Google sign-in could not complete. Please check the server configuration and try again.',
      ),
      oauth_clock_skew: t(
        'googleClockSkew',
        'Google sign-in failed because this computer clock appears out of sync. Please correct the time and try again.',
      ),
      google_id_token_invalid: t(
        'googleIdTokenInvalid',
        'Google sign-in returned an invalid token. Please try again.',
      ),
      invalid_oauth_state: t(
        'googleInvalidOAuthState',
        'Google sign-in session expired. Please try again.',
      ),
      google_oauth_not_configured: t(
        'googleOAuthNotConfigured',
        'Google sign-in is temporarily unavailable. Please try again later.',
      ),
      google_oauth_secret_missing: t(
        'googleOAuthSecretMissing',
        'Google sign-in is temporarily unavailable. Please try again later.',
      ),
      database_unavailable: t(
        'databaseUnavailable',
        DATABASE_UNAVAILABLE_HINT,
      ),
      oauth_network_error: t(
        'oauthNetworkError',
        'Could not reach Google to complete sign-in. Check your internet connection and try again.',
      ),
    };

    if (oauthErrorMessages[err]) {
      setError(oauthErrorMessages[err]);
      navigate('/login', { replace: true, state: location.state });
    } else if (err?.startsWith('google_') || err?.startsWith('oauth_')) {
      setError(t('googleSignInFailed'));
      navigate('/login', { replace: true, state: location.state });
    } else if (err === 'verification_failed') {
      setError(t('verificationLinkInvalid'));
      navigate('/login', { replace: true, state: location.state });
    } else if (err === 'account_unavailable') {
      setError(t('accountUnavailable'));
      navigate('/login', { replace: true, state: location.state });
    }
  }, [searchParams, t, navigate, location.state]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const databaseUnavailableMessage = t(
    'databaseUnavailable',
    DATABASE_UNAVAILABLE_HINT,
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    let cancelled = false;
    checkBackendDatabaseReady({ retries: 12, delayMs: 2000 }).then((ready) => {
      if (!ready && !cancelled) {
        setInfo(databaseUnavailableMessage);
      } else if (ready && !cancelled) {
        setInfo((current) => (
          current === databaseUnavailableMessage ? '' : current
        ));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [databaseUnavailableMessage]);

  const isDatabaseUnavailableError = (err) => {
    const status = err?.response?.status;
    const message = String(
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      '',
    ).toLowerCase();
    return (
      status === 503
      || message.includes('database')
      || message.includes('rds tunnel')
    );
  };

  const handleLoginSuccess = async (data) => {
    const payload = data?.data ?? data;
    const accessToken = payload?.accessToken || payload?.token;
    const refreshToken = payload?.refreshToken;

    if (!accessToken) throw new Error('No access token in response');

    login({ accessToken, refreshToken }, null);
    const fetchedUser = await refreshUser();
    if (!fetchedUser) {
      setError(t('loginProfileLoadFailed', 'Signed in but could not load your profile. Please refresh and try again.'));
      return;
    }
    const destination = resolveAfterAuthNavigation(
      localStorage.getItem('redirectAfterLogin') || from,
      fetchedUser,
    );
    localStorage.removeItem('redirectAfterLogin');

    navigate(destination.pathname, { replace: true, state: destination.state });
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }

    setBusy(true);
    setError('');

    try {
      const { data } = await authAPI.login({
        email: form.email,
        password: form.password,
        ...getProtectionPayload(),
      });

      await handleLoginSuccess(data);
    } catch (err) {
      resetProtection();
      if (isDatabaseUnavailableError(err)) {
        setError(databaseUnavailableMessage);
        return;
      }
      const body = err.response?.data;
      if (body?.emailVerified === false) {
        setError(body?.error || body?.message || t('verifyEmailBeforeLogin', 'Please verify your email before logging in.'));
        setInfo(t('verifyEmailResendHint', 'Use “Resend verification” below, or sign in with OTP to verify instantly.'));
      } else {
        setError(
          readApiError(err, t('invalidEmailOrPassword')),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }

    setBusy(true);
    setError('');

    try {
      await authAPI.sendOtp(form.email, getProtectionPayload());
      setStep(2);
      setInfo(`${t('otpSentTo')} ${form.email}`);
      resetProtection();
    } catch (err) {
      resetProtection();
      if (isDatabaseUnavailableError(err)) {
        setError(databaseUnavailableMessage);
        return;
      }
      const body = err.response?.data;
      setError(
        body?.error ||
        body?.message ||
        t('failedToSendOtp'),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }

    setBusy(true);
    setError('');

    try {
      const { data } = await authAPI.verifyOtp(
        form.email,
        form.otpCode,
        getProtectionPayload(),
      );

      await handleLoginSuccess(data);
    } catch (err) {
      resetProtection();
      if (isDatabaseUnavailableError(err)) {
        setError(databaseUnavailableMessage);
        return;
      }
      const body = err.response?.data;
      setError(
        body?.error ||
        body?.message ||
        t('invalidOtp'),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (import.meta.env.DEV) {
      const ready = await checkBackendDatabaseReady();
      if (!ready) {
        setError(databaseUnavailableMessage);
        return;
      }
    }
    startGoogleOAuth(localStorage.getItem('redirectAfterLogin') || from);
  };

  const handleLinkedInLogin = async () => {
    if (import.meta.env.DEV) {
      const ready = await checkBackendDatabaseReady();
      if (!ready) {
        setError(databaseUnavailableMessage);
        return;
      }
    }
    startLinkedInOAuth(localStorage.getItem('redirectAfterLogin') || from);
  };

  const handleResendVerification = async () => {
    if (!form.email) {
      setError('Enter your email first to resend verification link.');
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }
    try {
      const { data } = await authAPI.resendVerification(form.email, getProtectionPayload());
      setInfo(
        data?.message ||
          'If this email is pending verification, you will receive a link shortly.',
      );
      resetProtection();
    } catch (err) {
      resetProtection();
      if (isDatabaseUnavailableError(err)) {
        setError(databaseUnavailableMessage);
        return;
      }
      const body = err.response?.data;
      setError(body?.error || body?.message || 'Unable to resend verification link.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <AuthShell
      title={t('welcomeToCoBrother')}
      subtitle={t('loginSubtitle')}
      onBack={() => navigate('/')}
      footer={(
        <>
          <span>{t('dontHaveAccount')} </span>
          <Link to="/register">{t('registerTitle', 'Register')}</Link>
        </>
      )}
    >
      <AuthMethodToggle
        value={authMethod}
        onChange={setAuthMethod}
        googleLabel={t('authMethodSocial', 'Social')}
        emailLabel={t('authMethodEmail')}
      />

      <AuthAlert variant="error">{error}</AuthAlert>
      <AuthAlert variant="info">{info && info !== error ? info : ''}</AuthAlert>

      {authMethod === 'google' && (
        <div className="flex flex-col gap-3">
          <button type="button" className="btn-oauth btn-oauth--google" onClick={handleGoogleLogin}>
            <GoogleIcon />
            {t('continueWithGoogle')}
          </button>
          <button type="button" className="btn-oauth btn-oauth--linkedin" onClick={handleLinkedInLogin}>
            <LinkedInIcon />
            {t('continueWithLinkedIn', 'Continue with LinkedIn')}
          </button>
          <p className="auth-google-hint">{t('loginSocialHint', 'Use a social account for a fast, secure sign-in.')}</p>
        </div>
      )}

      {authMethod === 'email' && mode === 'password' && (
        <form onSubmit={handlePasswordLogin} className="auth-form flex flex-col gap-4">
          <div className="auth-form-field">
            <label className="auth-form-label" htmlFor="login-email">{t('emailLabel', 'Email')}</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('emailPlaceholder')}
              required
              className="auth-form-input"
            />
          </div>
          <div className="auth-form-field">
            <label className="auth-form-label" htmlFor="login-password">{t('passwordLabel', 'Password')}</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              placeholder={t('passwordPlaceholder', '••••••••')}
              required
              className="auth-form-input"
            />
          </div>
          <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
          <AuthPrimaryButton type="submit" busy={busy} disabled={requiresTurnstile}>
            {t('signIn')}
          </AuthPrimaryButton>
          <div className="auth-form-links">
            <Link to="/forgot-password">{t('forgotPasswordLink')}</Link>
            <button
              type="button"
              className="auth-form-link-btn"
              onClick={handleResendVerification}
              disabled={busy || requiresTurnstile}
            >
              Resend verification
            </button>
          </div>
          <button
            type="button"
            className="auth-otp-switch"
            onClick={() => { setMode('otp'); setError(''); setStep(1); }}
          >
            Sign in with OTP instead
          </button>
        </form>
      )}

      {authMethod === 'email' && mode === 'otp' && step === 1 && (
        <form onSubmit={handleSendOtp} className="auth-form flex flex-col gap-4">
          <div className="auth-form-field">
            <label className="auth-form-label" htmlFor="login-otp-email">{t('emailLabel', 'Email')}</label>
            <input
              id="login-otp-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('emailPlaceholder')}
              required
              className="auth-form-input"
            />
          </div>
          <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
          <AuthPrimaryButton type="submit" busy={busy} disabled={requiresTurnstile}>
            Send OTP
          </AuthPrimaryButton>
          <button
            type="button"
            className="auth-otp-switch"
            onClick={() => { setMode('password'); setError(''); setInfo(''); }}
          >
            ← {t('signIn')} with password
          </button>
        </form>
      )}

      {authMethod === 'email' && mode === 'otp' && step === 2 && (
        <form onSubmit={handleVerifyOtp} className="auth-form flex flex-col gap-4">
          <div className="auth-form-field">
            <label className="auth-form-label" htmlFor="login-otp-code">
              Enter OTP sent to {form.email}
            </label>
            <input
              id="login-otp-code"
              name="otpCode"
              value={form.otpCode}
              onChange={handleChange}
              placeholder="6-digit code"
              maxLength={6}
              className="auth-form-input otp-input"
              required
            />
          </div>
          <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
          <AuthPrimaryButton type="submit" busy={busy} disabled={requiresTurnstile}>
            Verify & Sign In
          </AuthPrimaryButton>
          <button
            type="button"
            className="auth-otp-switch"
            onClick={() => { setStep(1); setInfo(''); setForm((f) => ({ ...f, otpCode: '' })); }}
          >
            ← Back
          </button>
        </form>
      )}
    </AuthShell>
  );
}
