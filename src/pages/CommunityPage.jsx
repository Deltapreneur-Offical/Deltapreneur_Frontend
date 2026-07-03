import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, CircleHelp } from 'lucide-react';
import { communityAPI, communityAuctionAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { buildOrderCurrencyPayload } from '../utils/currencyDisplay';
import AppLayout from '../components/layout/AppLayout';
import CreatorIcon from '../assets/Cobrother_Profile.png';
import { useCreatorFollows } from '../hooks/useCreatorFollows';
import { useLikes } from '../hooks/useLikes';
import { COMMUNITY_INDUSTRIES } from '../constants/listingCategories';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import CommunityListingCard from '../components/listings/CommunityListingCard';
import CreatorPreviewModal from '../components/auctions/CreatorPreviewModal';
import ListingCardShell from '../components/listings/ListingCardShell';
import EditActionLabel from '../components/common/EditActionLabel';
import ListingBackLink from '../components/common/ListingBackLink';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import {
  evaluateCreatorProfileCompletion,
  getLinkedInProfileUrl,
  hasLinkedInAccount,
  isCreatorProfileComplete,
} from '../utils/creatorProfile';
import { isListingOwner } from '../utils/listingVisibility';
import CreatorProfileCompletionBanner from '../components/profile/CreatorProfileCompletionBanner';
import { useCreatorAuctionProfileSync } from '../hooks/useCreatorAuctionProfileSync';
import {
  auctionSummaryFromAuction,
  buildAuctionsMapFromProfiles,
  normalizeCreatorAuctionSummary,
  resolveCreatorAuctionId,
} from '../utils/creatorAuctionSummary';
import { readCreatorExpectedRate, formatCreatorExpectedRate, parseCreatorExpectedRate, buildCreatorExpectedRate, CREATOR_RATE_PERIODS } from '../utils/creatorExpectedRate';
import { readApiError } from '../utils/apiError';

const ROLES = [
  'FOUNDER','CO_FOUNDER','INVESTOR','MENTOR',
  'OPERATOR','FREELANCER','STUDENT','OTHER'
];
const WORK_TYPES = [
  { value: 'FREELANCE',   label: 'Freelance' },
  { value: 'FULL_TIME',   label: 'Full Time' },
  { value: 'PART_TIME',   label: 'Part Time' },
  { value: 'CONTRACT',    label: 'Contract'  },
  { value: 'OPEN_TO_ALL', label: 'Open to All' },
];
const DURATIONS = [
  { value: 'ONE_DAY',      label: '1 Day'    },
  { value: 'SEVEN_DAYS',   label: '7 Days'   },
  { value: 'FIFTEEN_DAYS', label: '15 Days'  },
  { value: 'THIRTY_DAYS',  label: '30 Days'  },
];

function apiErrorMessage(err, fallback) {
  return readApiError(err, fallback);
}

/** URLSearchParams.get() already decodes; avoid double decodeURIComponent (throws on % in text). */
function readQueryParamValue(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

const LINKEDIN_OAUTH_SESSION_KEY = 'cobrother.linkedin.oauth';

function clearLinkedInOAuthSession() {
  try {
    sessionStorage.removeItem(LINKEDIN_OAUTH_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function markLinkedInOAuthHandled(key) {
  try {
    sessionStorage.setItem(LINKEDIN_OAUTH_SESSION_KEY, key);
  } catch {
    /* ignore */
  }
}

function wasLinkedInOAuthHandled(key) {
  try {
    return sessionStorage.getItem(LINKEDIN_OAUTH_SESSION_KEY) === key;
  } catch {
    return false;
  }
}

export default function CommunityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [profiles, setProfiles]             = useState([]);
  const { toggle: toggleFollow, get: getFollow } = useCreatorFollows(profiles);
  const { toggle: toggleLike, get: getLike } = useLikes('COMMUNITY', profiles);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [myProfile, setMyProfile]           = useState(null);
  const [myAuction, setMyAuction]           = useState(null);
  const [detailProfile, setDetailProfile]   = useState(null);

  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInRedirecting, setLinkedInRedirecting] = useState(false);
  const [linkedInError, setLinkedInError]     = useState('');
  const [linkedInSuccess, setLinkedInSuccess] = useState('');
  const [profileNotice, setProfileNotice]     = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading]         = useState(false);

  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessNotice, setAccessNotice] = useState('');
  const [auctionsByCommunity, setAuctionsByCommunity] = useState({});

  const applyProfilesList = (list, { preferProfile } = {}) => {
    setProfiles(list);
    setAuctionsByCommunity((prev) => ({
      ...buildAuctionsMapFromProfiles(list),
      ...prev,
    }));
    const mine = preferProfile
      || (user ? list.find((p) => isListingOwner(p, user, 'community')) : null);
    if (mine) {
      setMyProfile(mine);
      setProfileNotice('');
      const summary = normalizeCreatorAuctionSummary(mine.auctionSummary);
      if (summary) {
        setMyAuction(summary);
        return;
      }
      if (mine.auctionSummary != null) {
        communityAuctionAPI.getByCommunity(mine.id)
          .then(({ data: ad }) => {
            const auction = ad?.auction ?? ad;
            setMyAuction(auction);
            const normalized = auctionSummaryFromAuction(auction);
            if (normalized) {
              setAuctionsByCommunity((prev) => ({
                ...prev,
                [mine.id]: normalized,
              }));
            }
          })
          .catch(() => setMyAuction(null));
        return;
      }
      setMyAuction(null);
    }
  };

  const reloadProfiles = async ({ preferProfile } = {}) => {
    try {
      setProfileNotice('');
      let myLoadNotice = '';
      const requests = [communityAPI.getAll()];
      if (user?.id || user?.userId) {
        requests.push(
          communityAPI.getMy().catch((err) => {
            const detail = err?.response?.data?.detail
              || err?.response?.data?.message
              || err?.response?.data?.error;
            if (
              err?.response?.status === 404
              && typeof detail === 'string'
              && detail.toLowerCase().includes('linkedin')
            ) {
              myLoadNotice = detail;
            }
            return null;
          }),
        );
      }

      const [allRes, myRes] = await Promise.all(requests);
      const list = Array.isArray(allRes.data) ? allRes.data : (allRes.data?.data ?? []);
      const myFromApi = myRes
        ? (myRes.data?.data ?? myRes.data ?? null)
        : null;
      const ownedInList = user
        ? list.find((p) => isListingOwner(p, user, 'community'))
        : null;

      if (!myFromApi && !ownedInList && !preferProfile && myLoadNotice) {
        setProfileNotice(myLoadNotice);
      } else {
        setProfileNotice('');
      }

      applyProfilesList(list, { preferProfile: preferProfile || myFromApi || ownedInList });
      return list;
    } catch (err) {
      setLinkedInError(apiErrorMessage(err, 'Could not load creator profiles. Please refresh the page.'));
      throw err;
    }
  };

  // Filter profiles based on search
  const filteredProfiles = profiles.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.user?.firstname?.toLowerCase().includes(query) ||
      p.user?.lastname?.toLowerCase().includes(query) ||
      p.headline?.toLowerCase().includes(query) ||
      p.skills?.toLowerCase().includes(query) ||
      p.industry?.toLowerCase().includes(query) ||
      p.role?.toLowerCase().includes(query)
    );
  });

  const ownedProfileInList = useMemo(
    () => profiles.find((p) => isListingOwner(p, user, 'community')) ?? null,
    [profiles, user],
  );

  const effectiveMyProfile = myProfile ?? ownedProfileInList;

  const profilesForDisplay = useMemo(() => {
    const publicProfiles = filteredProfiles.filter((profile) => isCreatorProfileComplete(profile));
    if (!effectiveMyProfile) return publicProfiles;
    if (publicProfiles.some((p) => String(p.id) === String(effectiveMyProfile.id))) {
      return publicProfiles;
    }
    return [effectiveMyProfile, ...publicProfiles];
  }, [filteredProfiles, effectiveMyProfile]);

  const profileCommunityIds = useMemo(
    () => profilesForDisplay.map((profile) => profile.id),
    [profilesForDisplay],
  );

  const handleAuctionProfileUpdate = useCallback((communityId, summary) => {
    setAuctionsByCommunity((prev) => ({
      ...prev,
      [String(communityId)]: {
        ...prev[String(communityId)],
        ...summary,
      },
    }));
    if (effectiveMyProfile && String(effectiveMyProfile.id) === String(communityId)) {
      setMyAuction((prev) => ({ ...prev, ...summary }));
    }
  }, [effectiveMyProfile?.id]);

  useCreatorAuctionProfileSync({
    communityIds: profileCommunityIds,
    onUpdate: handleAuctionProfileUpdate,
    onReconnect: () => {
      reloadProfiles().catch(() => {});
    },
  });

  const myProfileCompletion = useMemo(
    () => (effectiveMyProfile ? evaluateCreatorProfileCompletion(effectiveMyProfile) : null),
    [effectiveMyProfile],
  );

  const showEmptyCreators = !loading && profilesForDisplay.length === 0 && !effectiveMyProfile;

  // ── Handle LinkedIn redirect back ─────────────────────────────────────────
  useEffect(() => {
    const status = searchParams.get('linkedin');
    const profileId = searchParams.get('profileId');
    const errMsg = searchParams.get('linkedin_error');

    if (!status && !errMsg) return;

    const oauthKey = `${status || 'error'}-${profileId || errMsg || ''}`;
    if (wasLinkedInOAuthHandled(oauthKey)) {
      setSearchParams({}, { replace: true });
      return;
    }
    markLinkedInOAuthHandled(oauthKey);
    setSearchParams({}, { replace: true });

    if (errMsg) {
      setLinkedInError(readQueryParamValue(errMsg));
      return;
    }

    if (status === 'success' && profileId) {
      setLinkedInLoading(true);
      setLinkedInError('');
      communityAPI.getOne(profileId)
        .then(async ({ data }) => {
          const profile = data?.data ?? data;
          setMyProfile(profile);
          setShowForm(true);
          const hasUrl = Boolean(getLinkedInProfileUrl(profile));
          setLinkedInSuccess(
            hasUrl
              ? t(
                  'communityPageLinkedInImported',
                  'LinkedIn connected! Your profile link was imported — complete the details below.',
                )
              : t(
                  'communityPageLinkedInImportedNoUrl',
                  'LinkedIn connected! We imported your name and photo. Paste your public LinkedIn profile URL below and save.',
                ),
          );
          try {
            await reloadProfiles({ preferProfile: profile });
          } catch {
            setProfiles(prev => (
              prev.find(p => String(p.id) === String(profile.id)) ? prev : [profile, ...prev]
            ));
          }
        })
        .catch(() => setLinkedInError('LinkedIn connected but failed to load profile. Please refresh.'))
        .finally(() => setLinkedInLoading(false));
    }
  }, [searchParams, setSearchParams]);

  // ── Load all profiles + my auction ───────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    reloadProfiles()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  // Owner already has a profile — stale LinkedIn conflict banner is misleading.
  useEffect(() => {
    if (!effectiveMyProfile) return;
    setLinkedInError((prev) => (
      prev && prev.toLowerCase().includes('already connected') ? '' : prev
    ));
  }, [effectiveMyProfile?.id]);

  const { closeListingDetail, openDetailIfAllowed } = useOpenListingDetailFromUrl({
    items: profiles,
    loading,
    setDetail: setDetailProfile,
    fetchById: async (id) => {
      const { data } = await communityAPI.getOne(id);
      return data?.data ?? data;
    },
    listingType: 'community',
    user,
    authLoading,
    onAccessDenied: () => {
      setAccessNotice(t('listingDetailAccessDenied', 'This listing is not available to view yet.'));
    },
  });

  const handleConnectLinkedIn = async () => {
    setLinkedInError('');
    setLinkedInSuccess('');
    clearLinkedInOAuthSession();
    setLinkedInRedirecting(true);
    try {
      const { data } = await communityAPI.linkedInAuthUrl();
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const url    = parsed?.url ?? parsed?.authUrl ?? parsed;
      if (!url || typeof url !== 'string') throw new Error('Invalid auth URL');
      window.location.assign(url);
    } catch {
      setLinkedInRedirecting(false);
      setLinkedInError('Could not get LinkedIn auth URL. Please try again.');
    }
  };

  const handleProfileSaved = (saved) => {
    setMyProfile(saved);
    setShowForm(false);
    setLinkedInSuccess('');
    setProfiles(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
  };

  const handleAuctionCreated = (auction) => {
    const summary = auctionSummaryFromAuction(auction);
    setMyAuction(summary || auction);
    if (summary && effectiveMyProfile?.id) {
      setAuctionsByCommunity((prev) => ({
        ...prev,
        [String(effectiveMyProfile.id)]: summary,
      }));
    }
    setShowAuctionModal(false);
  };

  const handleDeleteProfile = async () => {
    if (!effectiveMyProfile?.id) return;
    setDeleteLoading(true);
    setLinkedInError('');
    try {
      await communityAPI.delete(effectiveMyProfile.id);
      setProfiles(prev => prev.filter(p => p.id !== effectiveMyProfile.id));
      setMyProfile(null);
      setMyAuction(null);
      setShowForm(false);
      setShowDeleteConfirm(false);
      setLinkedInSuccess('');
      clearLinkedInOAuthSession();
      setSearchParams({}, { replace: true });
      closeListingDetail();
    } catch (err) {
      setLinkedInError(apiErrorMessage(err, 'Failed to delete profile. Please try again.'));
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Active auction badge text
  const auctionStatusLabel = () => {
    if (!myAuction) return null;
    const display = myAuction.displayStatus;
    const s = myAuction.status;
    if (display === 'LIVE' || s === 'ACTIVE') return { text: '🟢 Auction live!', color: 'green' };
    if (s === 'EXTENDED') return { text: '⚡ Auction extended', color: 'amber' };
    if (display === 'DRAFT' || s === 'PAYMENT_PENDING') {
      return { text: '⏳ Auction draft', color: 'amber' };
    }
    if (s === 'ENDED') return { text: '🏆 Auction ended', color: 'purple' };
    if (s === 'COMPLETED') return { text: '✅ Auction completed', color: 'purple' };
    if (s === 'UNSOLD') return { text: 'Auction ended — no bids', color: 'red' };
    if (s === 'CLOSED') return { text: 'Auction closed', color: 'red' };
    if (display === 'ENDED') return { text: '🏆 Auction ended', color: 'purple' };
    return null;
  };
  const auctionBadge = auctionStatusLabel();
  const linkedInBusy = linkedInLoading || linkedInRedirecting;

  if (linkedInLoading) return (
    <AppLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Finishing LinkedIn import…</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-900 text-sm font-medium mb-6 leading-relaxed flex items-start gap-3 shadow-sm">
          <span className="text-lg leading-none select-none" aria-hidden>✨</span>
          <div className="flex-1">
            Complete your profile today to unlock your verified badge, instantly establish credibility, maximize your visibility, and attract top-tier opportunities.
          </div>
        </div>

        {linkedInError && (
          <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-sm text-red-600 mb-6">{linkedInError}</div>
        )}
        {profileNotice && !effectiveMyProfile && !linkedInError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-6">{profileNotice}</div>
        )}
        {linkedInSuccess && (
          <div className="p-4 bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-600 mb-6 flex items-center gap-2">
            <LinkedInIcon size={16} /> {linkedInSuccess}
          </div>
        )}
        {showForm && effectiveMyProfile ? (
          <>
            <ListingBackLink
              label={t('listingBackToCreators')}
              onClick={() => { setShowForm(false); setLinkedInSuccess(''); }}
            />
            <CommunityProfileForm
              initial={effectiveMyProfile}
              onSaved={handleProfileSaved}
              onCancel={() => { setShowForm(false); setLinkedInSuccess(''); }}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          </>
        ) : (
          <>
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold text-gray-900 m-0">{t('communityTitle')}</h1>
            <p className="text-gray-600 mt-1">{t('communityDesc')}</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            {effectiveMyProfile ? (
              <div className="flex gap-3 flex-wrap items-center">
                {/* Auction status / button */}
                {auctionBadge ? (
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      auctionBadge.color === 'green'  ? 'bg-green-50 text-green-700 border-green-300'  :
                      auctionBadge.color === 'amber'  ? 'bg-amber-50 text-amber-700 border-amber-300'  :
                      auctionBadge.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                      'bg-red-50 text-red-600 border-red-300'
                    }`}>{auctionBadge.text}</span>
                    <button className="btn-glow btn-glow-sm"
                      onClick={() => {
                        const targetId = resolveCreatorAuctionId(myAuction);
                        if (targetId) navigate(`/creator-auction/${targetId}`);
                      }}>
                      View Auction →
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-glow btn-glow-sm"
                    onClick={() => {
                      if (myAuction?.status === 'ACTIVE' || myAuction?.status === 'EXTENDED') {
                        const targetId = resolveCreatorAuctionId(myAuction);
                        if (targetId) navigate(`/creator-auction/${targetId}`);
                        return;
                      }
                      if (!readCreatorExpectedRate(effectiveMyProfile)) {
                        setAccessNotice('Add your Expected Rate in Edit Profile before putting your profile to auction.');
                        setShowForm(true);
                        return;
                      }
                      setShowAuctionModal(true);
                    }}
                  >
                    🔨 Put Profile to Auction
                  </button>
                )}
                <button className="btn-glow btn-glow-sm" onClick={() => navigate('/profile/analytics')}>
                  📈 Analytics
                </button>
                <button type="button" className="btn-glow btn-glow-sm inline-flex items-center justify-center" onClick={() => setShowForm(v => !v)}>
                  <EditActionLabel iconSize={16}>Edit Profile</EditActionLabel>
                </button>
                <button
                  type="button"
                  className="btn-glow btn-glow-sm btn-glow-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                >
                  Delete Profile
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2">
                <LinkedInConnectInfoTooltip />
                <button
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-[#0077b5] text-white font-semibold text-sm rounded-[10px] border-none cursor-pointer transition-colors hover:bg-[#005885] disabled:opacity-50"
                  onClick={handleConnectLinkedIn}
                  disabled={linkedInBusy}
                >
                  {linkedInBusy
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Connecting…</>
                    : <><LinkedInIcon /> Connect with LinkedIn</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('searchCreatorsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>

        {effectiveMyProfile && myProfileCompletion && !myProfileCompletion.isComplete ? (
          <CreatorProfileCompletionBanner
            profile={effectiveMyProfile}
            onEdit={() => setShowForm(true)}
          />
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : showEmptyCreators ? (
          <div className="text-center py-20">
            <div className="mb-4 flex justify-center">
              <img src={CreatorIcon} alt={t('disruptors')} className="w-16 h-16 opacity-50" />
            </div>
            <h3
              className={
                searchQuery
                  ? 'font-display text-2xl font-bold text-gray-900 mb-2'
                  : 'font-display text-sm font-medium text-gray-400 mb-2'
              }
            >
              {searchQuery ? t('noCreatorsFound') : t('noCreatorsYet')}
            </h3>
            {searchQuery ? (
              <p className="text-gray-600">Try adjusting your search terms.</p>
            ) : null}
          </div>
        ) : profilesForDisplay.length > 0 ? (
          <div className="listing-card-glow-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-5">
            {profilesForDisplay.map(p => (
              <ListingCardShell key={p.id} className="community-listing-card-shell">
              <CommunityListingCard
                profile={p}
                isMe={isListingOwner(p, user, 'community')}
                likeState={getLike(p.id)}
                onLike={() => toggleLike(p.id)}
                followState={getFollow(p.id)}
                onFollow={() => toggleFollow(p.id)}
                onView={() => openDetailIfAllowed(p)}
                onEdit={() => { setMyProfile(p); setShowForm(true); }}
              />
              </ListingCardShell>
            ))}
          </div>
        ) : null}
          </>
        )}
      </div>

      {detailProfile && (
        <CreatorPreviewModal
          profile={detailProfile}
          open={!!detailProfile}
          onClose={closeListingDetail}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('communityPageDeleteTitle')}
        message={t('communityPageDeleteMessage')}
        confirmLabel={deleteLoading ? t('communityPageDeleting') : t('communityPageDeletePermanently')}
        danger
        onConfirm={handleDeleteProfile}
        onCancel={() => !deleteLoading && setShowDeleteConfirm(false)}
      />

      {showAuctionModal && effectiveMyProfile && (
        <CreateAuctionModal
          communityId={effectiveMyProfile.id}
          profileName={effectiveMyProfile.name}
          profileExpectedRate={readCreatorExpectedRate(effectiveMyProfile)}
          onClose={() => setShowAuctionModal(false)}
          onSuccess={handleAuctionCreated}
        />
      )}
    </AppLayout>
  );
}

// ─── Create Auction Modal (form + Razorpay ₹118) ─────────────────────────────
function CreateAuctionModal({ communityId, profileName, profileExpectedRate, onClose, onSuccess }) {
  const { user } = useAuth();
  const { currency, formatPrice, getSymbol } = useCurrency();
  const [creationFeeInr, setCreationFeeInr] = useState(118);
  const creationFeeDisplay = formatPrice(creationFeeInr);
  const [step, setStep]       = useState('form'); // form | done
  const [form, setForm]       = useState({
    auctionTitle: '',
    auctionSkills: '',
    workType: 'OPEN_TO_ALL',
    availableFrom: '',
    additionalInfo: '',
    minBidPrice: '',
    duration: 'SEVEN_DAYS',
  });
  const [auctionId, setAuctionId]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  useEffect(() => {
    import('../utils/auctionFees').then(({ fetchListingFeesAndCharges }) => {
      fetchListingFeesAndCharges()
        .then((fees) => setCreationFeeInr(Number(fees?.auctionCreationFeeInr ?? 118)))
        .catch(() => {});
    });
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    if (!form.auctionTitle.trim()) { setError('Auction title is required.'); return; }
    if (!form.minBidPrice || parseFloat(form.minBidPrice) <= 0) { setError('Enter a valid minimum bid.'); return; }
    if (!profileExpectedRate) {
      setError('Expected Rate is missing on your profile. Save it in Edit Profile first.');
      return;
    }
    setLoading(true); setError('');
    try {
      const { payAuctionCreationFee } = await import('../utils/auctionFees');
      const creationFeeOrderId = await payAuctionCreationFee({
        auctionType: 'COMMUNITY',
        user,
        referenceId: communityId,
        description: 'Creator auction creation fee',
      });
      const payload = {
        ...form,
        expectedRate: profileExpectedRate,
        minBidPrice: parseFloat(form.minBidPrice),
        creationFeeOrderId,
      };
      const { data } = await communityAuctionAPI.create(communityId, payload);
      const auction = data?.auction ?? data;
      setAuctionId(auction?.id ?? null);
      setStep('done');
      onSuccess(auction);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create auction. Please try again.'));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[540px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer hover:text-gray-700" onClick={onClose}>✕</button>

        {step === 'form' && (
          <>
            <div className="mb-5">
              <div className="inline-flex items-center px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[0.72rem] font-semibold text-amber-700 uppercase tracking-wide mb-2">
                🔨 Profile Auction
              </div>
              <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1">Put Your Profile to Auction</h2>
              <p className="text-sm text-gray-500">Let companies bid to work with you. Auction creation fee: <strong>{creationFeeDisplay}</strong></p>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Auction Title <span className="text-red-500">*</span></label>
                <input name="auctionTitle" value={form.auctionTitle} onChange={handleChange}
                  placeholder="e.g. Senior React Developer — Available for Freelance"
                  className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Skills to Highlight <span className="text-gray-400 text-xs">(comma-separated)</span></label>
                <input name="auctionSkills" value={form.auctionSkills} onChange={handleChange}
                  placeholder="e.g. React, Node.js, System Design"
                  className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Work Type</label>
                <select name="workType" value={form.workType} onChange={handleChange}
                  className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 cursor-pointer transition-all">
                  {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>

              {profileExpectedRate ? (
                <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    Expected Rate
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatCreatorExpectedRate({ expectedRate: profileExpectedRate }, formatPrice) || profileExpectedRate}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 m-0">From your creator profile</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Available From</label>
                <input name="availableFrom" value={form.availableFrom} onChange={handleChange}
                  placeholder="e.g. Immediately, June 2025"
                  className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Additional Info <span className="text-gray-400 text-xs">(optional)</span></label>
                <textarea name="additionalInfo" value={form.additionalInfo} onChange={handleChange}
                  placeholder="Anything else bidders should know about you..."
                  rows={2}
                  className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all resize-vertical" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Minimum Bid ({getSymbol(currency).trim() || currency}) <span className="text-red-500">*</span></label>
                  <input name="minBidPrice" type="number" min="1" value={form.minBidPrice} onChange={handleChange}
                    placeholder="e.g. 50000"
                    className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Auction Duration <span className="text-red-500">*</span></label>
                  <select name="duration" value={form.duration} onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 cursor-pointer transition-all">
                    {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              {error && <div className="text-sm text-red-500 p-3 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

              <div className="flex gap-3 mt-1">
                <button type="submit" className="btn-glow flex-1" disabled={loading}>
                  {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : `Pay ${creationFeeDisplay} & Create Auction`}
                </button>
                <button type="button" className="btn-glow" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-2">Your Auction is Live!</h2>
            <p className="text-gray-500 text-sm">Bidders can now discover your profile and place bids.</p>
            <button className="btn-glow mt-6" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}



// ─── Community Profile Form ───────────────────────────────────────────────────
function CommunityProfileForm({
  initial,
  onSaved,
  onCancel,
  onDelete,
}) {
  const { t } = useTranslation();
  const buildForm = (profile) => {
    const { amount, period } = parseCreatorExpectedRate(readCreatorExpectedRate(profile));
    return {
      about: profile?.about || '',
      role: profile?.role || '',
      skills: profile?.skills || '',
      industry: profile?.industry || '',
      location: profile?.location || '',
      whyImHere: profile?.whyImHere || profile?.why_im_here || '',
      expectedRateAmount: amount,
      expectedRatePeriod: period,
      linkedInProfileUrl: getLinkedInProfileUrl(profile),
      introductionVideoLink: profile?.introductionVideoLink || profile?.introduction_video_link || '',
      resumeDriveLink: profile?.resumeDriveLink || profile?.resume_drive_link || '',
      portfolioWebsiteLink: profile?.portfolioWebsiteLink || profile?.portfolio_website_link || '',
      preferredWorkType: profile?.preferredWorkType || profile?.preferred_work_type || '',
      industryExpertise: profile?.industryExpertise || profile?.industry_expertise || '',
      languagesKnown: profile?.languagesKnown || profile?.languages_known || '',
    };
  };
  const [form, setForm] = useState(() => buildForm(initial));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    setForm(buildForm(initial));
  }, [
    initial?.id,
    initial?.linkedInProfileUrl,
    initial?.linked_in_profile_url,
    initial?.linkedInId,
    initial?.linked_in_id,
    initial?.name,
    initial?.imageUrl,
    initial?.expectedRate,
    initial?.expected_rate,
  ]);

  const linkedInUrl = useMemo(
    () => getLinkedInProfileUrl(form) || getLinkedInProfileUrl(initial),
    [form, initial],
  );

  const linkedInImported = hasLinkedInAccount(initial);
  const linkedInUrlMissing = linkedInImported && !linkedInUrl;

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!initial?.id) { setError('Profile ID missing — please refresh.'); return; }
    const expectedRate = buildCreatorExpectedRate(
      form.expectedRateAmount,
      form.expectedRatePeriod,
    );
    if (!expectedRate) {
      setError('Enter a valid Expected Rate amount and select a period.');
      return;
    }
    setLoading(true); setError('');
    try {
      const payload = {
        about: form.about,
        role: form.role,
        skills: form.skills,
        industry: form.industry,
        location: form.location,
        whyImHere: form.whyImHere,
        expectedRate,
        introductionVideoLink: form.introductionVideoLink,
        resumeDriveLink: form.resumeDriveLink,
        portfolioWebsiteLink: form.portfolioWebsiteLink,
        preferredWorkType: form.preferredWorkType,
        industryExpertise: form.industryExpertise,
        languagesKnown: form.languagesKnown,
      };
      const linkedInProfileUrl = (form.linkedInProfileUrl || '').trim();
      if (linkedInImported && linkedInProfileUrl) {
        payload.linkedInProfileUrl = linkedInProfileUrl;
      }
      const { data } = await communityAPI.update(initial.id, payload);
      onSaved(data?.data ?? data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 bg-white border border-gray-200 rounded-[18px] shadow-sm">
      {initial?.name && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-[10px] mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              {initial.imageUrl
                ? <img src={initial.imageUrl} alt={initial.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                : <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xl font-semibold text-indigo-600 flex-shrink-0">{initial.name[0]?.toUpperCase()}</div>
              }
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">{initial.name}</div>
                {linkedInUrl ? (
                  <a
                    href={linkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#0077b5] no-underline hover:text-[#005885] mt-1 break-all"
                  >
                    <LinkedInIcon size={13} />
                    <span className="truncate max-w-[280px] sm:max-w-[360px]">{linkedInUrl}</span>
                    <span aria-hidden>↗</span>
                  </a>
                ) : linkedInImported ? (
                  <p className="text-xs text-amber-800 m-0 mt-1 leading-relaxed">
                    {t(
                      'communityPageLinkedInUrlMissingHelp',
                      'We couldn\'t fetch your profile link automatically. Paste your public LinkedIn URL in the field below and save.',
                    )}
                  </p>
                ) : null}
                <p className="text-xs text-blue-600 mt-1.5 m-0">
                  ✓ {linkedInUrl
                    ? (initial.imageUrl
                      ? 'Name, photo, and LinkedIn URL imported from LinkedIn'
                      : 'Name and LinkedIn URL imported from LinkedIn')
                    : (initial.imageUrl
                      ? 'Name and photo imported from LinkedIn'
                      : 'Name imported from LinkedIn')}
                </p>
              </div>
            </div>
            {onDelete && (
              <button
                type="button"
                className="shrink-0 self-start px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors"
                onClick={onDelete}
              >
                Delete profile
              </button>
            )}
          </div>
        </div>
      )}
      <h3 className="font-display text-2xl text-gray-900 font-semibold">{t('completeCreatorProfile')}</h3>
      <p className="text-gray-500 text-sm mt-1">Help others understand what you bring to the table.</p>
      {!evaluateCreatorProfileCompletion(initial).isComplete ? (
        <CreatorProfileCompletionBanner profile={initial} />
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">

  {/* About - full width */}
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-700">
      About <span className="text-red-500">*</span>
    </label>
    <textarea
      name="about"
      value={form.about}
      onChange={handleChange}
      placeholder="Tell others about yourself..."
      rows={3}
      required
      className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all resize-vertical"
    />
  </div>

  {/* Role + Industry */}
  <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Your Role <span className="text-red-500">*</span></label>
            <select name="role" value={form.role} onChange={handleChange} required className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 cursor-pointer transition-all">
              <option value="">Select role</option>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Industry <span className="text-red-500">*</span></label>
            <select name="industry" value={form.industry} onChange={handleChange} required className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 cursor-pointer transition-all">
              <option value="">Select industry</option>
              {COMMUNITY_INDUSTRIES.map(i => <option key={i} value={i}>{i.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Skills <span className="text-red-500">*</span></label>
          <input name="skills" value={form.skills} onChange={handleChange} placeholder="e.g. Java, React, Marketing, Finance" required className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Location <span className="text-red-500">*</span></label>
          <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Bengaluru, India" required className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Expected Rate <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              name="expectedRateAmount"
              type="number"
              min="1"
              step="1"
              value={form.expectedRateAmount}
              onChange={handleChange}
              placeholder="e.g. 4000"
              required
              className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all"
            />
            <select
              name="expectedRatePeriod"
              value={form.expectedRatePeriod}
              onChange={handleChange}
              required
              className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 cursor-pointer transition-all"
            >
              {CREATOR_RATE_PERIODS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        {linkedInImported && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              LinkedIn URL <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal text-xs ml-1">
                {linkedInUrlMissing
                  ? '(paste your profile link)'
                  : '(imported from LinkedIn — you can edit)'}
              </span>
            </label>
            <input
              name="linkedInProfileUrl"
              type="url"
              required
              value={form.linkedInProfileUrl}
              onChange={handleChange}
              placeholder={t(
                'communityPageLinkedInUrlPlaceholder',
                'https://www.linkedin.com/in/your-name',
              )}
              className={
                linkedInUrlMissing
                  ? 'px-3 py-2 border border-amber-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all'
                  : 'px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all'
              }
            />
            {linkedInUrlMissing ? (
              <p className="text-xs text-slate-500 m-0">
                {t(
                  'communityPageLinkedInUrlManualHint',
                  'Paste the link from your browser when you open your LinkedIn profile (must include linkedin.com/in/…).',
                )}
              </p>
            ) : null}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Why I'm Here <span className="text-red-500">*</span></label>
          <textarea name="whyImHere" value={form.whyImHere} onChange={handleChange} placeholder="e.g. Looking to co-found a SaaS product..." rows={3} required className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all resize-vertical" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700"> Introduction Video Link (Google Drive / YouTube / Loom)</label>
          <input name="introductionVideoLink" value={form.introductionVideoLink} onChange={handleChange} placeholder="https://drive.google.com/file/d/..." className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Resume Drive Link (Google Drive PDF)</label>
          <input name="resumeDriveLink" value={form.resumeDriveLink} onChange={handleChange} placeholder="https://drive.google.com/file/d/..." className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Portfolio Website Link</label>
          <input name="portfolioWebsiteLink" value={form.portfolioWebsiteLink} onChange={handleChange} placeholder="https://yourportfolio.com" className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Preferred Work Type</label>
          <select name="preferredWorkType" value={form.preferredWorkType} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 cursor-pointer transition-all">
            <option value="">Select work type</option>
            <option value="FREELANCE">Freelance</option>
            <option value="FULL_TIME">Full-Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="CO_FOUNDER">Co-Founder</option>
            <option value="OPEN_TO_ALL">Open to All</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Industry Expertise</label>
          <input name="industryExpertise" value={form.industryExpertise} onChange={handleChange} placeholder="e.g. AI, IT, Healthcare, FinTech, SaaS" className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Languages Known</label>
          <input name="languagesKnown" value={form.languagesKnown} onChange={handleChange} placeholder="e.g. English, Hindi, Kannada" className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" />
        </div>
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="flex gap-3">
          <button type="submit" className="btn-glow" disabled={loading}>
            {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : 'Save Profile →'}
          </button>
          <button type="button" className="btn-glow" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function LinkedInConnectInfoTooltip() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const message = t(
    'communityPageLinkedInConnectHint',
    'We import your name, photo, and LinkedIn profile link automatically. On LinkedIn\'s permission screen, choose Allow for all requested access. If your link doesn\'t appear, paste your public profile URL in the form (e.g. linkedin.com/in/your-name).',
  );

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const maxWidth = Math.min(320, window.innerWidth - 24);
    let left = rect.right - maxWidth;
    left = Math.max(12, Math.min(left, window.innerWidth - maxWidth - 12));

    setStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      maxWidth,
      width: maxWidth,
      zIndex: 10050,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const target = e.target;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const tooltip = open && style && createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      style={style}
      className="px-3.5 py-3 text-xs leading-relaxed text-slate-600 bg-white border border-slate-200 rounded-xl shadow-lg break-words whitespace-normal"
    >
      {message}
    </div>,
    document.body,
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-[#0077b5] hover:text-[#0077b5] hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0077b5]/30"
        aria-label={t('communityPageLinkedInConnectHelpAria', 'How LinkedIn connect works')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <CircleHelp size={16} aria-hidden />
      </button>
      {tooltip}
    </>
  );
}

function LinkedInIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
