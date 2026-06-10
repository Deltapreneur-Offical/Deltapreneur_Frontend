import { useTranslation } from 'react-i18next';

export default function CreatorFollowButton({
  following = false,
  count = 0,
  disabled = false,
  loading = false,
  onToggle,
  className = '',
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`creator-profile-card__follow${following ? ' creator-profile-card__follow--active' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-pressed={following}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle?.();
      }}
    >
      <span className="creator-profile-card__follow-label">
        {loading
          ? t('creatorFollowLoading', '...')
          : following
            ? t('creatorFollowing', 'Following')
            : t('creatorFollow', 'Follow')}
      </span>
      {count > 0 ? (
        <span className="creator-profile-card__follow-count" aria-hidden>
          {count}
        </span>
      ) : null}
    </button>
  );
}
