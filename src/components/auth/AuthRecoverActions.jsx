import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AuthRecoverActions({ email = '', show = false }) {
  const { t } = useTranslation();

  if (!show) return null;

  const navState = email ? { email } : undefined;

  return (
    <div className="auth-recover-actions">
      <p className="auth-recover-actions-hint">{t('registerEmailConflictHint')}</p>
      <div className="auth-recover-actions-links">
        <Link to="/login" state={navState}>{t('signIn')}</Link>
        <Link to="/forgot-password" state={navState}>{t('forgotPasswordLink')}</Link>
      </div>
    </div>
  );
}
