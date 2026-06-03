import LikeButton from '../common/LikeButton';
import { EditIcon } from '../common/EditActionLabel';
import ListingBrowseFooter from './ListingBrowseFooter';
import MarketplaceListingCardFrame, { ListingCardBadge } from './MarketplaceListingCardFrame';

function LinkedInIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
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
  const skills = profile.skills?.split(',').map((s) => s.trim()).filter(Boolean) || [];
  const accentGrad = 'from-teal-600 via-cyan-500 to-blue-500';

  const headerBadges = (
    <>
      <ListingCardBadge variant="glass">👤 Creator</ListingCardBadge>
      {profile.role && (
        <ListingCardBadge variant="verified">{profile.role.replace(/_/g, ' ')}</ListingCardBadge>
      )}
      {isMe && <ListingCardBadge variant="owner">✦ You</ListingCardBadge>}
    </>
  );

  const body = (
    <>
      <div className="flex flex-col gap-1 mb-1 flex-shrink-0">
        <h3 className="font-display text-sm font-extrabold text-gray-900 leading-snug line-clamp-1">
          {profile.name || 'Anonymous'}
        </h3>
        <div className="flex items-center gap-1 flex-wrap max-h-[22px] overflow-hidden">
          {profile.industry && (
            <span className="px-1.5 py-[2px] bg-gray-100 text-gray-500 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
              {profile.industry.replace(/_/g, ' ')}
            </span>
          )}
          {profile.location && (
            <span className="px-1.5 py-[2px] bg-gray-100 text-gray-500 text-[9px] font-bold rounded whitespace-nowrap">
              📍 {profile.location}
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-2 min-h-[30px] flex-shrink-0">
        {profile.bio || profile.description || 'Creator profile on CoBrother marketplace.'}
      </p>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 max-h-[52px] overflow-hidden flex-shrink-0">
          {skills.slice(0, 4).map((skill) => (
            <span key={skill} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-600">
              {skill}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-400">
              +{skills.length - 4}
            </span>
          )}
        </div>
      )}
      {profile.linkedInProfileUrl && (
        <a
          href={profile.linkedInProfileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[10px] text-[#0077b5] no-underline mb-2 hover:text-[#005885] flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkedInIcon size={12} /> LinkedIn
        </a>
      )}
    </>
  );

  const footer = browseMode ? (
    <ListingBrowseFooter onViewDetails={onView} label="View Profile" className="border-t-0 pt-0">
      {onLike ? (
        <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} forceRed />
      ) : (
        <span className="text-xs text-gray-500">👁 {profile.views || 0}</span>
      )}
    </ListingBrowseFooter>
  ) : (
    <div className="flex justify-between items-center gap-2 border-t border-gray-100 pt-2">
      {onLike ? (
        <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} forceRed />
      ) : (
        <span className="text-xs text-gray-500">👁 {profile.views || 0}</span>
      )}
      {isMe && (
        <button
          type="button"
          className="py-1.5 px-3 bg-gray-900 text-white text-[10px] font-bold rounded hover:bg-gray-800 inline-flex items-center gap-1"
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
        >
          <EditIcon size={14} /> Edit
        </button>
      )}
    </div>
  );

  return (
    <MarketplaceListingCardFrame
      cardClassName={`community-listing-card${isMe ? ' ring-1 ring-indigo-200' : ''}`}
      gradient={accentGrad}
      image={profile.imageUrl}
      imageAlt={profile.name}
      initial={profile.name?.[0]?.toUpperCase() || '?'}
      headerBadges={headerBadges}
      browseMode={browseMode}
      onClick={onView}
      footer={footer}
    >
      {body}
    </MarketplaceListingCardFrame>
  );
}
