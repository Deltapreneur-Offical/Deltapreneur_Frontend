import { UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LikeButton from '../common/LikeButton';
import { EditIcon } from '../common/EditActionLabel';

export default function CommunityListingCard({
  profile,
  isMe,
  browseMode = false,
  onView,
  onEdit,
  likeState,
  onLike,
}) {
  const { t } = useTranslation();
  const roleLabel = profile.role?.replace(/_/g, ' ');
  const headline =
    profile.headline?.trim()
    || [roleLabel, profile.industry?.replace(/_/g, ' ')].filter(Boolean).join(' · ')
    || profile.bio?.trim()
    || t('listingCardCreatorSummary');
  const subtitle = [profile.location, profile.skills?.split(',')[0]?.trim()]
    .filter(Boolean)
    .join(' · ');

  const stop = (e) => e.stopPropagation();

  return (
    <article
      className={`community-listing-card listing-card-glow card-glow-hover group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300${
        isMe ? ' ring-1 ring-indigo-200' : ''
      }`}
    >
      {/* Banner */}
      <div className="relative h-14 shrink-0 bg-[#cfe9e5]">
        {profile.imageUrl ? (
          <img
            src={profile.imageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : null}

        {isMe ? (
          <button
            type="button"
            className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition-colors hover:bg-black/70"
            onClick={(e) => {
              stop(e);
              onEdit?.();
            }}
            title={t('listingCardEditProfile')}
            aria-label={t('listingCardEditProfile')}
          >
            <EditIcon size={14} />
          </button>
        ) : null}
      </div>

      {/* Avatar — centered, overlapping banner */}
      <div className="relative z-10 -mt-10 flex justify-center px-4">
        {profile.imageUrl ? (
          <img
            src={profile.imageUrl}
            alt={profile.name}
            className="h-[72px] w-[72px] rounded-full border-[3px] border-white object-cover shadow-md"
          />
        ) : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-teal-500 to-blue-600 font-display text-2xl font-bold text-white shadow-md">
            {profile.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2 text-center">
        <h3 className="font-display text-[0.9375rem] font-bold leading-snug text-gray-900 line-clamp-2">
          {profile.name || t('listingCardAnonymous')}
        </h3>

        {isMe ? (
          <span className="mx-auto mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
            {t('listingCardOwner')}
          </span>
        ) : null}

        <p className="mt-1.5 text-xs leading-snug text-gray-600 line-clamp-2">{headline}</p>

        {subtitle ? (
          <p className="mt-1 text-[11px] leading-snug text-gray-400 line-clamp-1">{subtitle}</p>
        ) : null}

        {(onLike || profile.views > 0) && (
          <div
            className="mt-2 flex items-center justify-center gap-2"
            onClick={stop}
            onMouseDown={stop}
            role="presentation"
          >
            {onLike ? (
              <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} forceRed />
            ) : (
              <span className="text-[10px] text-gray-400">👁 {profile.views || 0}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3">
          <button
            type="button"
            className="community-listing-card__cta inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#0a66c2] bg-white px-4 py-2 text-sm font-semibold text-[#0a66c2] transition-colors hover:bg-[#ebf3f8]"
            onClick={(e) => {
              stop(e);
              onView?.();
            }}
          >
            <UserPlus size={16} strokeWidth={2.25} aria-hidden />
            {t('listingCardViewDetails')}
          </button>
        </div>
      </div>
    </article>
  );
}
