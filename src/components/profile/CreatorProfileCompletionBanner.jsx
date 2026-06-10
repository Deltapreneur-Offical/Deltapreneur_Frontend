import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { evaluateCreatorProfileCompletion } from '../../utils/creatorProfile';
import '../../styles/creator-profile-completion-banner.css';

export default function CreatorProfileCompletionBanner({ profile, onEdit, editTo }) {
  const { t } = useTranslation();
  const completion = evaluateCreatorProfileCompletion(profile);

  if (!profile || completion.isComplete) return null;

  const ctaLabel = t('creatorProfileCompleteCta', { defaultValue: 'Complete profile' });

  const cta = editTo ? (
    <Link to={editTo} className="creator-completion-banner__cta">
      {ctaLabel}
    </Link>
  ) : onEdit ? (
    <button type="button" className="creator-completion-banner__cta" onClick={onEdit}>
      {ctaLabel}
    </button>
  ) : null;

  return (
    <section
      className="creator-completion-banner"
      role="status"
      aria-label={t('creatorProfileStatusIncomplete', { defaultValue: 'Profile incomplete' })}
    >
      <div className="creator-completion-banner__icon" aria-hidden="true">
        <AlertCircle size={18} strokeWidth={2.25} />
      </div>

      <div className="creator-completion-banner__content">
        <p className="creator-completion-banner__title">
          <span className="creator-completion-banner__status">
            {t('creatorProfileStatusIncomplete', { defaultValue: 'Profile incomplete' })}
          </span>
          <span className="creator-completion-banner__dot" aria-hidden="true">·</span>
          <span className="creator-completion-banner__percent">{completion.percent}%</span>
        </p>
        <p className="creator-completion-banner__message">
          {t('creatorProfileCompletionWarning', {
            defaultValue: 'Complete your profile to make it visible publicly.',
          })}
        </p>
      </div>

      {cta ? <div className="creator-completion-banner__actions">{cta}</div> : null}
    </section>
  );
}
