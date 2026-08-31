import { useTranslation } from 'react-i18next';
import BackButton from './BackButton';

/** Consistent "Back to Home" control for marketing / public pages. */
export default function BackToHomeButton({ className = '', variant = 'professional' }) {
  const { t } = useTranslation();

  return (
    <BackButton
      to="/"
      label={t('backToHomeLabel')}
      variant={variant}
      className={className}
    />
  );
}
