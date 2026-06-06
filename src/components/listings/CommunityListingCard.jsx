import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import LikeButton from '../common/LikeButton';
import { EditIcon } from '../common/EditActionLabel';

function formatRoleLabel(role) {
  if (!role) return '';
  return role.toString().replace(/_/g, ' ').toUpperCase();
}

function formatIndustryLabel(industry) {
  if (!industry) return '';
  return industry.toString().replace(/_/g, ' ').toUpperCase();
}

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
  const skills = profile.skills?.split(',').map((s) => s.trim()).filter(Boolean) || [];
  const imageUrl = profile.imageUrl || profile.image_url || null;
  const name = profile.name || t('listingCardAnonymous');
  const roleLabel = formatRoleLabel(profile.role);
  const industryLabel = formatIndustryLabel(profile.industry);
  const primaryLine = [roleLabel, industryLabel].filter(Boolean).join(' · ');
  const locationPart = profile.location?.trim() || '';
  const skillPart = skills[0] || '';
  const secondaryLine = [locationPart, skillPart].filter(Boolean).join(' · ');

  const handleView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onView?.();
  };

  return (
    <article
      className={`community-listing-card community-profile-card group relative bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200 shadow-sm transition-all duration-300 h-full min-h-[340px] ${
        isMe ? 'ring-1 ring-indigo-200' : ''
      }`}
    >
      <div className="relative h-[92px] flex-shrink-0 overflow-hidden rounded-t-2xl bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2px] opacity-90"
            />
            <div className="absolute inset-0 bg-black/10" />
          </>
        ) : null}
      </div>

      <div className="flex flex-col items-center text-center px-4 pb-5 pt-0 flex-1 -mt-10 relative z-10">
        <div className="flex-shrink-0 mb-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-[72px] h-[72px] rounded-full object-cover border-[3px] border-white shadow-md bg-white"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-white shadow-md bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center font-display text-2xl font-bold text-white">
              {name[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        <h3 className="font-display text-[1.05rem] font-bold text-gray-900 leading-tight line-clamp-1 m-0">
          {name}
        </h3>

        {primaryLine ? (
          <p className="mt-1.5 mb-0 text-[0.68rem] font-semibold tracking-[0.06em] text-gray-800 uppercase leading-snug">
            {primaryLine}
          </p>
        ) : null}

        {secondaryLine ? (
          <p className="mt-1 mb-0 text-[0.72rem] text-gray-400 leading-snug line-clamp-1">
            {secondaryLine}
          </p>
        ) : null}

        <div className="mt-3 mb-4 flex justify-center">
          {onLike ? (
            <LikeButton
              liked={likeState?.liked}
              count={likeState?.count}
              onToggle={onLike}
              forceRed
            />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-[20px] px-2.5 py-1 text-[0.72rem] bg-gray-50 border border-gray-200 text-gray-500">
              <span className="grayscale-0">❤️</span>
              <span className="font-semibold text-[#c86e6e]">{profile.views || 0}</span>
            </span>
          )}
        </div>

        <div className="mt-auto w-full flex flex-col items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 w-full max-w-[220px] py-2.5 px-4 rounded-full border-2 border-blue-500 text-blue-600 text-[0.8rem] font-semibold bg-white hover:bg-blue-50 transition-colors"
            onClick={handleView}
          >
            <UserPlus size={17} strokeWidth={2.25} aria-hidden />
            {t('listingCardViewDetails')}
          </button>

          {isMe && !browseMode ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[0.72rem] font-semibold text-gray-600 hover:text-gray-900"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <EditIcon size={14} />
              {t('edit')}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
