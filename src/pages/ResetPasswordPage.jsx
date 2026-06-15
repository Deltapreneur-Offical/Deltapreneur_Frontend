import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/services';
import AuthShell from '../components/auth/AuthShell';
import AuthAlert from '../components/auth/AuthAlert';
import AuthPrimaryButton from '../components/auth/AuthPrimaryButton';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!token) {
      setError(t('resetPasswordInvalidLink'));
      return;
    }
    if (password !== confirm) {
      setError(t('passwordsNoMatch'));
      return;
    }

    setBusy(true);
    try {
      const { data } = await authAPI.resetPassword(token, password);
      setInfo(data?.message || t('resetPasswordSuccess'));
      setPassword('');
      setConfirm('');
    } catch (err) {
      const body = err.response?.data;
      setError(body?.error || body?.message || t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('resetPasswordTitle')}
      subtitle={t('resetPasswordSubtitle')}
      onBack={() => navigate('/login')}
      footer={(
        <>
          <span>{t('backToLogin')} </span>
          <Link to="/login">{t('loginLink')}</Link>
        </>
      )}
    >
      <AuthAlert variant="error">{error}</AuthAlert>
      <AuthAlert variant="info">{info}</AuthAlert>

      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-form-field">
          <label className="auth-form-label" htmlFor="reset-password">{t('newPasswordLabel')}</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('passwordPlaceholder')}
            required
            autoComplete="new-password"
            className="auth-form-input"
          />
        </div>
        <div className="auth-form-field">
          <label className="auth-form-label" htmlFor="reset-confirm">{t('confirmPasswordLabel')}</label>
          <input
            id="reset-confirm"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t('confirmPasswordPlaceholder')}
            required
            autoComplete="new-password"
            className="auth-form-input"
          />
        </div>

        <AuthPrimaryButton type="submit" busy={busy}>
          {t('resetPasswordSubmit')}
        </AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}
