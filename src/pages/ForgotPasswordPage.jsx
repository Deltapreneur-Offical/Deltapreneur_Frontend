import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/services';
import BotProtectionFields from '../components/common/BotProtectionFields';
import { useBotProtection } from '../hooks/useBotProtection';
import AuthShell from '../components/auth/AuthShell';
import AuthAlert from '../components/auth/AuthAlert';
import AuthPrimaryButton from '../components/auth/AuthPrimaryButton';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const {
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  } = useBotProtection();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (requiresTurnstile) {
      setError(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const { data } = await authAPI.forgotPassword(email, getProtectionPayload());
      setInfo(data?.message || t('forgotPasswordSuccess'));
      resetProtection();
    } catch (err) {
      resetProtection();
      const body = err.response?.data;
      setError(body?.error || body?.message || t('forgotPasswordError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('forgotPasswordTitle')}
      subtitle={t('forgotPasswordSubtitle')}
      onBack={() => navigate('/login')}
      footer={(
        <>
          <span>{t('rememberPassword', 'Remember your password?')} </span>
          <Link to="/login">{t('backToSignIn')}</Link>
        </>
      )}
    >
      <AuthAlert variant="error">{error}</AuthAlert>
      <AuthAlert variant="info">{info}</AuthAlert>

      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-form-field">
          <label className="auth-form-label" htmlFor="forgot-email">{t('emailLabel')}</label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            required
            autoComplete="email"
            className="auth-form-input"
          />
        </div>

        <BotProtectionFields {...botProtectionProps} className="flex flex-col gap-3" />
        <AuthPrimaryButton type="submit" busy={busy} disabled={requiresTurnstile}>
          {t('forgotPasswordSubmit')}
        </AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}
