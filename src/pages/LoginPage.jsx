import { useState, useEffect } from 'react';

import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { authAPI } from '../api/services';

import { useAuth } from '../context/AuthContext';

import { API_ORIGIN, PRODUCTION_API_ORIGIN } from '../config/urls';
import { resolveAfterAuthNavigation, saveReturnLocationBeforeOAuth } from '../utils/authSession';

import coBrotherLogo from '../assets/Cobrother_logo.png';
import BotProtectionFields from '../components/common/BotProtectionFields';
import { useBotProtection } from '../hooks/useBotProtection';



export default function LoginPage() {

  const { t } = useTranslation();

  const { user, loading, login, refreshUser } = useAuth();

  const navigate  = useNavigate();

  const location  = useLocation();

  const [searchParams] = useSearchParams();

  const from =
    location.state?.from ||
    localStorage.getItem('redirectAfterLogin') ||
    null;

  const showLoginForm = location.state?.showLoginForm === true;



  const [mode, setMode]   = useState('password');

  const [step, setStep]   = useState(1);

  const [form, setForm]   = useState({ email: '', password: '', otpCode: '' });

  const [busy, setBusy]   = useState(false);

  const [error, setError] = useState('');

  const [info, setInfo]   = useState('');

  const {
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  } = useBotProtection();



  // ── If already logged in, redirect away ──────────────────────────────────

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



  // ── Show OAuth error if redirected back with ?error= ─────────────────────

  useEffect(() => {
    const err = searchParams.get('error');
    const oauthErrorMessages = {
      oauth_failed: t('googleSignInFailed'),
      oauth_profile: t('googleSignInFailed'),
      google_authentication_failed: t('googleSignInFailed'),
      oauth_token_exchange_failed: t(
        'googleTokenExchangeFailed',
        'Google sign-in could not complete. Please check the Google OAuth redirect URI and try again.',
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
        'Google sign-in is not configured for this environment.',
      ),
      google_oauth_secret_missing: t(
        'googleOAuthSecretMissing',
        'Google sign-in is missing the backend client secret.',
      ),
      database_unavailable: t(
        'databaseUnavailable',
        'The database is temporarily unavailable. Please try again shortly.',
      ),
    };

    if (oauthErrorMessages[err]) {
      setError(oauthErrorMessages[err]);
    } else if (err?.startsWith('google_') || err?.startsWith('oauth_')) {
      setError(t('googleSignInFailed'));
    } else if (err === 'verification_failed') {
      setError(t('verificationLinkInvalid'));
    } else if (err === 'account_unavailable') {
      setError(t('accountUnavailable'));
    }
  }, [searchParams, t]);



  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });



  // ── Helper: handle any successful login response ──────────────────────────

  const handleLoginSuccess = async (data) => {

    // Backend may nest under data.data

    const payload = data?.data ?? data;

    const accessToken  = payload?.accessToken  || payload?.token;

    const refreshToken = payload?.refreshToken;



    if (!accessToken) throw new Error('No access token in response');



    login({ accessToken, refreshToken }, null);

    const fetchedUser = await refreshUser();

    const destination = resolveAfterAuthNavigation(
      localStorage.getItem('redirectAfterLogin') || from,
      fetchedUser,
    );
    localStorage.removeItem('redirectAfterLogin');

    navigate(destination.pathname, { replace: true, state: destination.state });

  };



  // ── Password login ────────────────────────────────────────────────────────

  const handlePasswordLogin = async e => {

    e.preventDefault();

    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }

    setBusy(true); setError('');

    try {

      const { data } = await authAPI.login({
        email: form.email,
        password: form.password,
        ...getProtectionPayload(),
      });

      await handleLoginSuccess(data);

    } catch (err) {
      resetProtection();
      const body = err.response?.data;
      if (body?.emailVerified === false) {
        setError(body?.error || body?.message || t('verifyEmailBeforeLogin', 'Please verify your email before logging in.'));
        setInfo(t('verifyEmailResendHint', 'Use “Resend verification” below, or sign in with OTP to verify instantly.'));
      } else {
        setError(
          body?.error ||
          body?.message ||
          err.message ||
          t('invalidEmailOrPassword'),
        );
      }
    } finally { setBusy(false); }

  };



  // ── OTP: send ─────────────────────────────────────────────────────────────

  const handleSendOtp = async e => {

    e.preventDefault();

    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }

    setBusy(true); setError('');

    try {

      await authAPI.sendOtp(form.email, getProtectionPayload());

      setStep(2);

      setInfo(`${t('otpSentTo')} ${form.email}`);
      resetProtection();

    } catch (err) {
      resetProtection();
      const body = err.response?.data;
      setError(
        body?.error ||
        body?.message ||
        t('failedToSendOtp'),
      );
    } finally { setBusy(false); }

  };



  // ── OTP: verify ───────────────────────────────────────────────────────────

  const handleVerifyOtp = async e => {

    e.preventDefault();

    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }

    setBusy(true); setError('');

    try {

      const { data } = await authAPI.verifyOtp(
        form.email,
        form.otpCode,
        getProtectionPayload(),
      );

      await handleLoginSuccess(data);

    } catch (err) {
      resetProtection();
      const body = err.response?.data;
      setError(
        body?.error ||
        body?.message ||
        t('invalidOtp'),
      );
    } finally { setBusy(false); }

  };



  // ── Google OAuth ─────────────────────────────────────────────────────────────

  const handleGoogleLogin = () => {
    saveReturnLocationBeforeOAuth(
      localStorage.getItem('redirectAfterLogin') || from,
    );
    // OAuth must start on the backend host (same host as GOOGLE_OAUTH_REDIRECT_URI callback).
    // Do not use the Vercel SPA origin — oauth_state cookie would not be sent on callback.
    const backend = (API_ORIGIN || PRODUCTION_API_ORIGIN).replace(/\/$/, '');
    window.location.href = `${backend}/oauth2/authorization/google`;
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
      const body = err.response?.data;
      setError(body?.error || body?.message || 'Unable to resend verification link.');
    } finally {
      setBusy(false);
    }
  };



  // Don't flash login page if already loading auth state

  if (loading) return null;



  return (

    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden bg-gradient-to-b from-gray-50 to-indigo-50">

      <div className="fixed inset-0 z-0 pointer-events-none">

        <div className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] md:w-[500px] md:h-[500px] bg-purple/16 rounded-full blur-[80px] opacity-70 -top-[120px] -right-[120px] md:-top-[150px] md:-right-[100px]" />

        <div className="absolute w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px] bg-blue-500/12 rounded-full blur-[80px] opacity-70 -bottom-[80px] -left-[80px] md:-bottom-[100px] md:-left-[100px]" />

        <div className="absolute inset-0 opacity-65" style={{backgroundImage: 'linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />

      </div>



      <div className="relative z-10 w-full max-w-[420px] sm:max-w-[440px] bg-white/92 px-5 pt-12 pb-6 sm:px-8 sm:pt-12 sm:pb-8 md:p-10 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/60 backdrop-blur-xl">

        <button

          onClick={() => navigate('/')}

          className="absolute top-3 left-3 sm:top-4 sm:left-4 group flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_4px_15px_rgba(147,51,234,0.4)] hover:shadow-[0_8px_25px_rgba(147,51,234,0.5)] hover:-translate-y-0.5 transition-all duration-300"

        >

          <svg

            className="w-5 h-5 text-white transition-transform duration-300 group-hover:-translate-x-0.5"

            fill="none"

            stroke="currentColor"

            viewBox="0 0 24 24"

            strokeWidth="2.5"

            strokeLinecap="round"

            strokeLinejoin="round"

          >

            <path d="M19 12H5M12 19l-7-7 7-7" />

          </svg>

        </button>

        <div className="text-center mb-6 sm:mb-8">

          <img src={coBrotherLogo} alt="CoBrother" className="w-[170px] sm:w-[190px] md:w-[200px] h-auto object-contain mx-auto mb-3 sm:mb-4 block" />

          <h1 className="font-display text-[1.9rem] sm:text-[2rem] font-semibold text-gray-900 leading-tight">Welcome to CoBrother</h1>

          {/* <p className="text-gray-600 text-[1rem] sm:text-[1.05rem] mt-2 sm:mt-2.5 max-w-[260px] sm:max-w-[300px] mx-auto">Where ventures f */}

        </div>



        <button className="w-full flex items-center justify-center gap-3 px-4 py-3.5 sm:py-3 bg-white border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-medium rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:border-gray-400 hover:bg-gray-50 hover:shadow-[0_10px_24px_rgba(0,0,0,0.06)]" onClick={handleGoogleLogin}>

          <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">

            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>

            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>

            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>

          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>

          </svg>

          {t('continueWithGoogle')}

        </button>

        <div className="auth-divider my-5 sm:my-6">
          <span className="text-gray-400 text-xs uppercase tracking-wide">or</span>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-600 text-sm mb-4">
            {error}
          </div>
        )}
        {info && (
          <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-[10px] text-emerald-700 text-sm mb-4">
            {info}
          </div>
        )}

        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('emailLabel', 'Email')}</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t('emailPlaceholder')}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('passwordLabel', 'Password')}</label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder={t('passwordPlaceholder', '••••••••')}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
              />
            </div>
            <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
            <button type="submit" className="btn-glow w-full" disabled={busy || requiresTurnstile}>
              {busy ? (
                <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin inline-block" />
              ) : (
                t('signIn')
              )}
            </button>
            <div className="flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-gray-500 hover:text-purple-600">
                Forgot password?
              </Link>
              <button
                type="button"
                className="text-gray-500 hover:text-purple-600"
                onClick={handleResendVerification}
                disabled={busy || requiresTurnstile}
              >
                Resend verification
              </button>
            </div>
          </form>
        )}

        {mode === 'otp' && step === 1 && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('emailLabel', 'Email')}</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t('emailPlaceholder')}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
              />
            </div>
            <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
            <button type="submit" className="btn-glow w-full" disabled={busy || requiresTurnstile}>
              {busy ? (
                <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin inline-block" />
              ) : (
                'Send OTP'
              )}
            </button>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-purple-600"
              onClick={() => { setMode('password'); setError(''); setInfo(''); }}
            >
              ← {t('signIn')} with password
            </button>
          </form>
        )}

        {mode === 'otp' && step === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Enter OTP sent to {form.email}
              </label>
              <input
                name="otpCode"
                value={form.otpCode}
                onChange={handleChange}
                placeholder="6-digit code"
                maxLength={6}
                className="otp-input w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.1)]"
                required
              />
            </div>
            <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
            <button type="submit" className="btn-glow w-full" disabled={busy || requiresTurnstile}>
              {busy ? (
                <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin inline-block" />
              ) : (
                'Verify & Sign In'
              )}
            </button>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-purple-600"
              onClick={() => { setStep(1); setInfo(''); setForm(f => ({ ...f, otpCode: '' })); }}
            >
              ← Back
            </button>
          </form>
        )}

        {mode === 'password' && (
          <button
            type="button"
            className="mt-3 w-full text-sm text-gray-500 hover:text-purple-600"
            onClick={() => { setMode('otp'); setError(''); setStep(1); }}
          >
            Sign in with OTP instead
          </button>
        )}

        <div className="flex gap-2 justify-center mt-6 text-sm text-gray-500">
          <span>{t('dontHaveAccount')}</span>
          <Link to="/register" className="text-purple-600 font-medium hover:underline">
            {t('registerTitle', 'Register')}
          </Link>
        </div>

      </div>

    </div>

  );

}



