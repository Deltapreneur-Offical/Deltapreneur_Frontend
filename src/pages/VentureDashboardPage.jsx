import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { coVentureAPI, likeAPI, ventureAPI, ventureDealAPI, venturePitchAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import useCurrency from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import VentureIcon from '../assets/Coventure_logo.png';
import VentureGstinVerificationModal from '../components/venture/VentureGstinVerificationModal';
import VentureVerifyListingModal from '../components/venture/VentureVerificationModal';
import VentureVerificationPendingBanner from '../components/venture/VentureVerificationPendingBanner';
import EditActionLabel from '../components/common/EditActionLabel';
import PartnershipTimelineCard from '../components/venture/PartnershipTimelineCard';
import { asArray } from '../utils/asArray';
import { pickMediaUrl } from '../utils/mediaUrl';
import VentureSubNav from '../components/venture/VentureSubNav';
import VentureDealRow from '../components/venture/VentureDealRow';
import PayoutSettingsButton from '../components/payout/PayoutSettingsButton';
import PayoutProfileBanner from '../components/payout/PayoutProfileBanner';
import { useAuth } from '../context/AuthContext';
import { isVentureProfileComplete } from '../utils/ventureProfileUtils';
import { formatEquityOfferedPct, formatEquityPercent } from '../constants/ventureLabels';
import ConfirmDialog from '../components/common/ConfirmDialog';
import FormCheckbox from '../components/common/FormCheckbox';
import {
  countVenturesPendingVerification,
  filterVenturesForSection,
} from '../utils/ventureVerification';
import { PendingVerificationDot } from '../components/domains/DomainVerificationPendingBanner';

const STATUS_META = {
  PENDING:  { label: 'Pending',  color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', icon: '⏳' },
  APPROVED: { label: 'Under Review', color: '#6ea8c8', bg: 'rgba(110,168,200,0.12)', icon: '★' },
  REJECTED: { label: 'Not Selected', color: '#c86e6e', bg: 'rgba(200,110,110,0.12)', icon: '✕'  },
  SELECTED: { label: 'Partner Selected', color: '#6ec896', bg: 'rgba(110,200,150,0.12)', icon: '🤝' },
};

const PITCH_STATUS_META = {
  PENDING: { label: 'Pending', color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', icon: '⏳' },
  SHORTLISTED: { label: 'Shortlisted', color: '#6ea8c8', bg: 'rgba(110,168,200,0.12)', icon: '★' },
  SELLER_ACCEPTED: { label: 'Accepted', color: '#6ec896', bg: 'rgba(110,200,150,0.12)', icon: '✓' },
  SELLER_REJECTED: { label: 'Rejected', color: '#c86e6e', bg: 'rgba(200,110,110,0.12)', icon: '✕' },
  DEAL_SELECTED: { label: 'Deal Selected', color: '#8b6ec8', bg: 'rgba(139,110,200,0.12)', icon: '🤝' },
  CANCELLED: { label: 'Withdrawn', color: '#888', bg: 'rgba(136,136,136,0.12)', icon: '—' },
};

const AUCTION_STATUS_COLORS = {
  DRAFT:    'text-gray-500',
  ACTIVE:   'text-green-500',
  EXTENDED: 'text-yellow-500',
  ENDED:    'text-purple-500',
  UNSOLD:   'text-red-500',
  CLOSED:   'text-gray-400',
};

const SECTION_META = {
  venture: { label: 'Venture', icon: '💼', desc: 'Acquisition and equity sale listings' },
  coventure: { label: 'Co-Venture', icon: '🤝', desc: 'Partnership and co-founder listings' },
};

const VENTURE_TABS = [
  { id: 'incoming', label: 'Bids Received' },
  { id: 'applied', label: 'My Bids' },
  { id: 'deals', label: 'Deals' },
];

const COVENTURE_TABS = [
  { id: 'applications', label: 'Partnership Applications' },
  { id: 'my-partnerships', label: 'My Partnerships' },
  { id: 'deals', label: 'Deals' },
];

export default function VentureDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [section, setSection] = useState('venture');
  const [ventureTab, setVentureTab] = useState('incoming');
  const [coTab, setCoTab] = useState('applications');
  const [myVentures, setMyVentures] = useState([]);
  const [verifyListingOpen, setVerifyListingOpen] = useState(false);

  const loadMyVentures = useCallback(() => {
    ventureAPI.getMyVentures()
      .then(({ data }) => setMyVentures(asArray(data)))
      .catch(() => setMyVentures([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadMyVentures();
  }, [user, loadMyVentures]);

  const sectionVentures = filterVenturesForSection(myVentures, section);
  const pendingVerificationCount = countVenturesPendingVerification(sectionVentures);
  const showVerifyOnTabs = ['incoming', 'applied', 'applications', 'my-partnerships'].includes(
    section === 'venture' ? ventureTab : coTab,
  );

  const activeTabs = section === 'venture' ? VENTURE_TABS : COVENTURE_TABS;
  const activeTab = section === 'venture' ? ventureTab : coTab;
  const setActiveTab = section === 'venture' ? setVentureTab : setCoTab;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <Link
          to="/ventures"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4 text-sm font-medium"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Ventures
        </Link>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">{t('ventureDashboardPageTitle')}</h1>
            <p className="text-gray-600 mt-1">{t('ventureDashboardPageSubtitle')}</p>
          </div>
          {user ? <PayoutSettingsButton /> : null}
        </div>

        {user ? <PayoutProfileBanner context="venture" className="mb-6" /> : null}

        <VentureSubNav activeRoute="dashboard" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {Object.entries(SECTION_META).map(([key, meta]) => {
            const selected = section === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
                  selected
                    ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-white shadow-sm ring-1 ring-indigo-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl" aria-hidden>{meta.icon}</span>
                  <span className="font-display text-lg font-semibold text-gray-900">{meta.label}</span>
                </div>
                <p className="text-sm text-gray-500 m-0">{meta.desc}</p>
              </button>
            );
          })}
        </div>

        {showVerifyOnTabs && pendingVerificationCount > 0 ? (
          <VentureVerificationPendingBanner
            count={pendingVerificationCount}
            onVerifyClick={() => setVerifyListingOpen(true)}
          />
        ) : null}

        <div className="flex gap-2 mb-6 flex-wrap items-center p-1 rounded-xl border border-gray-200 bg-gray-50/80">
          {activeTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`btn-glow btn-glow-sm relative ${activeTab === id ? 'dashboard-active-control' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
              {showVerifyOnTabs
                && pendingVerificationCount > 0
                && (id === 'incoming' || id === 'applied' || id === 'applications' || id === 'my-partnerships') ? (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center">
                    <PendingVerificationDot className="h-2.5 w-2.5" />
                  </span>
                ) : null}
            </button>
          ))}
          {showVerifyOnTabs && sectionVentures.length > 0 ? (
            <button
              type="button"
              className="btn-glow btn-glow-sm ml-auto inline-flex items-center gap-1.5"
              onClick={() => setVerifyListingOpen(true)}
            >
              <ShieldCheck size={14} aria-hidden />
              Verify listing (optional)
            </button>
          ) : null}
        </div>

        {section === 'venture' && ventureTab === 'incoming' && <IncomingPitches />}
        {section === 'venture' && ventureTab === 'applied' && <MyPitches />}
        {section === 'venture' && ventureTab === 'deals' && <MyDeals dealKind="VENTURE_SALE" emptyLabel="No venture deals yet" />}

        {section === 'coventure' && coTab === 'applications' && <IncomingApplications />}
        {section === 'coventure' && coTab === 'my-partnerships' && <MyApplications />}
        {section === 'coventure' && coTab === 'deals' && (
          <MyDeals dealKind="CO_VENTURE" emptyLabel="No partnership deals yet" />
        )}

        {verifyListingOpen && (
          <VentureVerifyListingModal
            ventures={sectionVentures}
            onClose={() => setVerifyListingOpen(false)}
            onSaved={loadMyVentures}
          />
        )}
      </div>
    </AppLayout>
  );
}

// ─── My Listings ──────────────────────────────────────────────────────────────
function MyListings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ventures, setVentures]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [verifyTarget, setVerifyTarget] = useState(null);

  const loadVentures = useCallback(() => {
    ventureAPI.getMyVentures()
      .then(({ data }) => setVentures(asArray(data)))
      .catch(() => setVentures([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    ventureAPI.getMyVentures()
      .then(({ data }) => setVentures(asArray(data)))
      .catch(() => setVentures([]))
      .finally(() => setLoading(false));
  }, []);

  const handleVerified = () => {
    loadVentures();
    setVerifyTarget(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;

  if (ventures.length === 0) return (
    <div className="text-center py-20">
      <div className="flex justify-center mb-6">
        <img src={VentureIcon} alt="" className="w-20 h-20 object-contain opacity-30" />
      </div>
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{t('ventureDashboardNoListingsTitle')}</h3>
      <p className="text-gray-600 mb-4">{t('ventureDashboardNoListingsBody')}</p>
      <button className="btn-glow" onClick={() => navigate('/ventures')}>
        {t('ventureDashboardListVenture')}
      </button>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        {ventures.map(v => (
          <VentureListingRow
            key={v.id}
            venture={v}
            onVerify={() => setVerifyTarget(v)}
            onListingChanged={loadVentures}
          />
        ))}
      </div>

      {verifyTarget && (
        <VentureGstinVerificationModal
          venture={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onVerified={() => handleVerified()}
        />
      )}
    </>
  );
}

function VentureListingRow({ venture, onVerify, onListingChanged }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const b = venture.brandDetails || {};
  const listingMode = venture.listingMode || 'VENTURE';
  const isInactive = venture.status === false;
  const isGstinVerified = Boolean(venture.verified || venture.gstinVerified);
  const profileComplete = isVentureProfileComplete(venture);

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl flex-wrap gap-2 shadow-sm">
      <div>
        <div className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
          {b.brandName || '—'}
          <span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded border ${
            listingMode === 'CO_VENTURE'
              ? 'text-[#147A43] bg-[#F3FDE8] border-[#BEF38A]'
              : 'text-blue-600 bg-blue-50 border-blue-200'
          }`}>
            {listingMode === 'CO_VENTURE' ? 'Co-Venture' : 'Venture'}
          </span>
          <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded border ${
            profileComplete
              ? 'text-green-700 bg-green-50 border-green-200'
              : 'text-amber-700 bg-amber-50 border-amber-200'
          }`}>
            {profileComplete ? 'Profile complete' : 'Profile incomplete'}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {b.industry?.replace(/_/g, ' ')}
          {venture.stage && ` · ${venture.stage.replace(/_/g, ' ')}`}
          {venture.ventureListingStatus && ` · ${venture.ventureListingStatus.replace(/_/g, ' ')}`}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
          venture.status
            ? 'text-green-600 bg-green-50 border border-green-200'
            : 'text-gray-500 bg-gray-50 border border-gray-200'
        }`}>
          {venture.status ? t('ventureDashboardActive') : t('ventureDashboardInactive')}
        </span>

        {isGstinVerified && (
          <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md">
            {t('ventureDashboardGstinVerified')}
          </span>
        )}

        {venture.takenDown && (
          <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
            {t('ventureDashboardTakenDown')}
          </span>
        )}

        {b.dealValue > 0 && listingMode === 'VENTURE' && (
          <span className="text-sm font-bold text-green-600">{formatPrice(b.dealValue)}</span>
        )}

        {!isGstinVerified && !isInactive && (
          <button className="btn-glow btn-glow-sm" onClick={onVerify}>
            Verify GSTIN (optional)
          </button>
        )}

        <button
          type="button"
          className="btn-secondary btn-sm text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200"
          onClick={() => navigate(`/ventures/${venture.id}/edit#company-profile`)}
        >
          Edit Company Profile
        </button>

        {isInactive && (
          <button type="button" className="btn-glow btn-glow-sm inline-flex items-center justify-center" onClick={() => navigate(`/ventures/${venture.id}/edit`)}>
            <EditActionLabel iconSize={16}>Edit</EditActionLabel>
          </button>
        )}

        {listingMode === 'CO_VENTURE' && venture.ventureListingStatus === 'PARTNERSHIP_FINALIZED' && (
          <PartnershipTimelineCard ventureName={b.brandName} />
        )}

        {listingMode === 'CO_VENTURE' && venture.ventureListingStatus !== 'PARTNERSHIP_FINALIZED' && !isInactive && (
          <span className="text-xs text-gray-500">
            {venture.coVentureApplicationCount || 0} partnership application{venture.coVentureApplicationCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Incoming Pitches (venture sale) ──────────────────────────────────────────
function isAcquisitionOffer(pitch) {
  return pitch.venture?.dealType === 'FULL_ACQUISITION'
    && Number(pitch.requestedEquityPercent) === 100;
}

function IncomingPitches() {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [acceptAcknowledged, setAcceptAcknowledged] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    venturePitchAPI.getReceived()
      .then(({ data }) => setPitches(asArray(unwrapApiData(data) || data)))
      .catch(() => setPitches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAction = (type, pitch) => {
    setAcceptAcknowledged(false);
    setPendingAction({ type, pitch });
  };

  const closeAction = () => {
    if (actionLoading) return;
    setPendingAction(null);
    setAcceptAcknowledged(false);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { type, pitch } = pendingAction;
    if (type === 'accept' && !acceptAcknowledged) return;

    setActionLoading(pitch.id);
    try {
      if (type === 'accept') {
        const { data } = await venturePitchAPI.finalizeDeal(pitch.ventureId, pitch.id);
        const payload = unwrapApiData(data) || data;
        const dealId = payload?.deal?.id;
        if (dealId) navigate(`/ventures/deals/${dealId}`);
        else load();
      } else {
        await venturePitchAPI.sellerReject(pitch.id);
        load();
      }
      setPendingAction(null);
      setAcceptAcknowledged(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingPitch = pendingAction?.pitch;
  const pendingAcquisition = pendingPitch ? isAcquisitionOffer(pendingPitch) : false;

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;
  if (pitches.length === 0) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No bids yet</h3>
      <p className="text-gray-600">Buyer bids on your venture listings will appear here.</p>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        {pitches.map((pitch) => {
          const s = PITCH_STATUS_META[pitch.status] || PITCH_STATUS_META.PENDING;
          const buyer = pitch.buyer || {};
          const acquisition = isAcquisitionOffer(pitch);
          const buyerName = [buyer.firstname, buyer.lastname].filter(Boolean).join(' ') || 'Buyer';
          return (
            <div key={pitch.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-gray-900">
                      {pitch.venture?.brandName || 'Venture'}
                    </div>
                    {acquisition && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Acquisition Offer
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    {buyerName} · {buyer.email}
                    {buyer.phoneNumber && (
                      <> · <a href={`tel:${buyer.phoneNumber}`} className="text-indigo-600 hover:underline">{buyer.phoneNumber}</a></>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {acquisition ? (
                      <>Offer Amount: {formatPrice(pitch.offeredAmount)} · 100% Acquisition</>
                    ) : (
                      <>Investor Offer: {formatPrice(pitch.offeredAmount)} · Requested Equity: {formatEquityPercent(pitch.requestedEquityPercent)}%</>
                    )}
                  </div>
                  {pitch.investmentProposal && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proposal</div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{pitch.investmentProposal}</p>
                    </div>
                  )}
                  {pitch.additionalNotes && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Notes</div>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{pitch.additionalNotes}</p>
                    </div>
                  )}
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: s.bg, color: s.color }}>
                  {s.icon} {s.label}
                </div>
              </div>
              {['PENDING', 'SHORTLISTED', 'SELLER_ACCEPTED'].includes(pitch.status) && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    className="btn-glow btn-glow-sm"
                    disabled={!!actionLoading}
                    onClick={() => openAction('accept', pitch)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={!!actionLoading}
                    onClick={() => openAction('reject', pitch)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pendingAction?.type === 'accept' && pendingPitch && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-6 animate-fadeIn backdrop-blur-md"
          style={{ background: 'rgba(17, 24, 39, 0.42)' }}
          onClick={(e) => e.target === e.currentTarget && closeAction()}
        >
          <div className="relative w-full max-w-[480px] bg-white border border-gray-200 rounded-2xl shadow-[0_24px_60px_rgba(17,24,39,0.2)] animate-slideUp overflow-hidden p-9 mx-4 md:mx-0">
            <div className="text-[2rem] mb-3 text-center">🤝</div>
            <h2 className="font-display text-[1.65rem] font-semibold mb-2 text-gray-900 text-center">
              {pendingAcquisition ? 'Accept buyer and finalize deal?' : 'Accept pitch and finalize deal?'}
            </h2>
            <p className="text-gray-600 text-[0.9rem] mb-4 leading-relaxed text-center">
              {pendingAcquisition
                ? `You are selecting ${[pendingPitch.buyer?.firstname, pendingPitch.buyer?.lastname].filter(Boolean).join(' ') || 'this buyer'} for a full acquisition. Your listing will close and other pitches will be declined.`
                : 'Accepting will select this investor, close your listing, and start the deal workflow with Deltapreneur.'}
            </p>
            <FormCheckbox
              checked={acceptAcknowledged}
              onChange={(e) => setAcceptAcknowledged(e.target.checked)}
              className="mb-6 w-full"
            >
              I understand this action is final and will close my venture listing to other buyers
            </FormCheckbox>
            <div className="flex gap-3 justify-center items-center w-full max-w-[360px] mx-auto">
              <button
                type="button"
                className="btn-glow flex-1 min-w-0"
                disabled={!acceptAcknowledged || !!actionLoading}
                onClick={confirmAction}
              >
                {actionLoading ? 'Processing…' : 'Accept & Finalize'}
              </button>
              <button type="button" className="btn-glow flex-1 min-w-0" onClick={closeAction} disabled={!!actionLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingAction?.type === 'reject'}
        title="Reject this pitch?"
        message="The buyer will be notified that their pitch was declined. This cannot be undone."
        confirmLabel="Reject Pitch"
        danger
        onConfirm={confirmAction}
        onCancel={closeAction}
      />
    </>
  );
}

function MyPitches() {
  const { formatPrice } = useCurrency();
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    venturePitchAPI.getMy()
      .then(({ data }) => setPitches(asArray(unwrapApiData(data) || data)))
      .catch(() => setPitches([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;
  if (pitches.length === 0) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No pitches yet</h3>
      <p className="text-gray-600">Browse ventures and submit investment pitches.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {pitches.map((pitch) => {
        const s = PITCH_STATUS_META[pitch.status] || PITCH_STATUS_META.PENDING;
        return (
          <div key={pitch.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{pitch.venture?.brandName || 'Venture'}</div>
              <div className="text-xs text-gray-500">
                Investor Offer: {formatPrice(pitch.offeredAmount)} · Requested Equity: {formatEquityPercent(pitch.requestedEquityPercent)}%
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: s.bg, color: s.color }}>
              {s.icon} {s.label}
            </div>
            {pitch.status === 'PENDING' && (
              <button className="btn-glow btn-glow-sm" onClick={() => venturePitchAPI.withdraw(pitch.id).then(() => setPitches((p) => p.filter((x) => x.id !== pitch.id)))}>
                Withdraw
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MyDeals({ dealKind, emptyLabel = 'No deals yet' }) {
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDeals = useCallback(() => {
    setLoading(true);
    ventureDealAPI.getMy()
      .then(({ data }) => {
        const all = asArray(unwrapApiData(data) || data);
        setDeals(dealKind ? all.filter((d) => d.dealKind === dealKind) : all);
      })
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, [dealKind]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;
  if (deals.length === 0) return (
    <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
      <div className="text-5xl mb-4">{dealKind === 'CO_VENTURE' ? '🤝' : '💼'}</div>
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{emptyLabel}</h3>
      <p className="text-gray-600">
        {dealKind === 'CO_VENTURE'
          ? 'Finalized partnership deals will appear here after you select a partner.'
          : 'Finalized venture deals will appear here after you accept a pitch.'}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3.5">
      {deals.map((deal) => (
        <VentureDealRow
          key={deal.id}
          deal={deal}
          formatPrice={formatPrice}
          user={user}
          onPayNow={(d) => navigate(`/ventures/deals/${d.id}`)}
        />
      ))}
    </div>
  );
}

function groupApplicationsByVenture(applications) {
  const buckets = applications.reduce((acc, app) => {
    const ventureId = app.venture?.id || app.ventureId || 'unknown';
    if (!acc[ventureId]) {
      acc[ventureId] = { venture: app.venture, apps: [] };
    }
    acc[ventureId].apps.push(app);
    return acc;
  }, {});

  const nameCounts = {};
  Object.values(buckets).forEach(({ venture }) => {
    const name = venture?.brandDetails?.brandName || 'Unknown';
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });

  return Object.entries(buckets).map(([ventureId, { venture, apps }]) => {
    const brandName = venture?.brandDetails?.brandName || 'Unknown Venture';
    const industry = venture?.brandDetails?.industry?.replace(/_/g, ' ');
    const title = nameCounts[brandName] > 1
      ? `${brandName}${industry ? ` · ${industry}` : ''}`
      : brandName;
    const subtitle = nameCounts[brandName] > 1
      ? `Listing ${String(ventureId).slice(0, 8)}…`
      : (industry || null);
    return { ventureId, title, subtitle, venture, apps };
  });
}

// ─── Incoming Applications (to MY ventures) ───────────────────────────────────
function IncomingApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expandedId, setExpandedId]     = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectTarget, setSelectTarget] = useState(null);
  const [selectAcknowledged, setSelectAcknowledged] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    coVentureAPI.getMyVentureApplications()
      .then(({ data }) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (appId, newStatus) => {
    setActionLoading(appId + newStatus);
    try {
      await coVentureAPI.updateStatus(appId, newStatus);
      setApplications(prev =>
        prev.map(a => a.id === appId ? { ...a, status: newStatus } : a)
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setActionLoading(null);
    }
  };

  const openSelectPartner = (app) => {
    setSelectAcknowledged(false);
    setSelectTarget(app);
  };

  const closeSelectPartner = () => {
    if (actionLoading) return;
    setSelectTarget(null);
    setSelectAcknowledged(false);
  };

  const confirmSelectPartner = async () => {
    if (!selectTarget || !selectAcknowledged) return;
    setActionLoading(`${selectTarget.id}SELECT`);
    try {
      const { data } = await coVentureAPI.selectPartner(selectTarget.id);
      const payload = data?.data ?? data ?? {};
      const dealId = payload.dealId;
      setSelectTarget(null);
      setSelectAcknowledged(false);
      if (dealId) navigate(`/ventures/deals/${dealId}`);
      else load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to select partner.');
    } finally {
      setActionLoading(null);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Partner Name', 'Phone', 'Location', 'GST No', 'Venture', 'Status', 'Equity Offered (%)', 'Contribution', 'Contribution Plan'],
      ...applications.map(a => [
        a.fullName || '',
        a.phone || '',
        a.location || '',
        a.gstNo || '',
        a.venture?.brandDetails?.brandName || '',
        a.status || '',
        formatEquityOfferedPct(a.venture?.equityPercentOffered ?? a.venture?.equity_percent_offered) || '',
        a.description || '',
        a.contributionPlan || '',
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'coventure-applications.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = groupApplicationsByVenture(applications);

  return (
    <div>
      <div className="flex gap-3 items-center mb-6 flex-wrap justify-end">
        <button
          type="button"
          className="btn-glow btn-glow-sm"
          onClick={exportCSV}
          disabled={applications.length === 0}
        >
          ↓ Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
      ) : applications.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No partnership applications yet</h3>
          <p className="text-gray-600">When someone applies to partner on your co-venture listings, they will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(({ ventureId, title, subtitle, apps }) => (
            <div key={ventureId}>
              <h3 className="text-gray-900 mb-1 text-base font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1ED891]" aria-hidden />
                {title}
                <span className="text-gray-500 font-normal text-sm">
                  ({apps.length} application{apps.length !== 1 ? 's' : ''})
                </span>
              </h3>
              {subtitle && (
                <p className="text-xs text-gray-400 mb-3 ml-4">{subtitle}</p>
              )}
              <div className="flex flex-col gap-3">
                {apps.map(app => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    expanded={expandedId === app.id}
                    onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    onApprove={() => handleStatusUpdate(app.id, 'APPROVED')}
                    onReject={() => handleStatusUpdate(app.id, 'REJECTED')}
                    onSelectPartner={() => openSelectPartner(app)}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectTarget && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-6 animate-fadeIn backdrop-blur-md"
          style={{ background: 'rgba(17, 24, 39, 0.42)' }}
          onClick={(e) => e.target === e.currentTarget && closeSelectPartner()}
        >
          <div className="relative w-full max-w-[480px] bg-white border border-gray-200 rounded-2xl shadow-[0_24px_60px_rgba(17,24,39,0.2)] animate-slideUp overflow-hidden p-9 mx-4 md:mx-0">
            <div className="text-[2rem] mb-3 text-center">🤝</div>
            <h2 className="font-display text-[1.65rem] font-semibold mb-2 text-gray-900 text-center">
              Select partner and finalize partnership?
            </h2>
            <p className="text-gray-600 text-[0.9rem] mb-4 leading-relaxed text-center">
              You are selecting <strong>{selectTarget.fullName || 'this applicant'}</strong> as your partner
              for <strong>{selectTarget.venture?.brandDetails?.brandName || 'this co-venture'}</strong>.
              Your listing will close to other applicants and Deltapreneur will assist both parties with next steps.
            </p>
            <FormCheckbox
              checked={selectAcknowledged}
              onChange={(e) => setSelectAcknowledged(e.target.checked)}
              className="mb-6 w-full"
            >
              I understand this action is final and will close my co-venture listing to other applicants
            </FormCheckbox>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={closeSelectPartner} disabled={!!actionLoading}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-glow flex-1"
                disabled={!selectAcknowledged || !!actionLoading}
                onClick={confirmSelectPartner}
              >
                {actionLoading === `${selectTarget.id}SELECT` ? 'Processing…' : 'Select Partner & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app, expanded, onToggle, onApprove, onReject, onSelectPartner, actionLoading }) {
  const s = STATUS_META[app.status] || STATUS_META.PENDING;
  const equityLabel = formatEquityOfferedPct(
    app.venture?.equityPercentOffered ?? app.venture?.equity_percent_offered,
  );

  const stop = (e) => e.stopPropagation();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:border-[#1ED891]/80 transition-colors">
      <button
        type="button"
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/80 transition-colors"
        onClick={onToggle}
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F3FDE8] to-[#E7F9D6] flex items-center justify-center font-bold text-[#147A43] text-base flex-shrink-0">
          {app.fullName?.[0]?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{app.fullName || 'Unknown applicant'}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            {[app.phone, app.location].filter(Boolean).join(' · ') || 'No contact info'}
          </div>
          {!expanded && app.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{app.description}</p>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
          style={{ background: s.bg, color: s.color }}>
          {s.icon} {s.label}
        </div>

        <span className="text-gray-400 text-sm flex-shrink-0 w-5 text-center" aria-hidden>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gradient-to-b from-gray-50/50 to-white">
          {equityLabel && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F3FDE8] border border-[#BEF38A] text-xs font-semibold text-[#147A43]">
              Equity offered on listing: {equityLabel}
            </div>
          )}

          <ApplicationDetailSection title="Contact & Identity">
            <DetailGrid>
              <Detail label="Full Name" value={app.fullName} />
              <Detail label="Phone" value={app.phone} />
              <Detail label="Location" value={app.location} />
              <Detail label="GST No" value={app.gstNo || 'Not provided'} />
            </DetailGrid>
          </ApplicationDetailSection>

          <ApplicationDetailSection title="Contribution">
            <DetailGrid>
              <Detail label="Contribution Statement" value={app.description} wide />
              <Detail label="Contribution Plan" value={app.contributionPlan} wide />
              <Detail label="Motivation" value={app.motivation} wide />
            </DetailGrid>
          </ApplicationDetailSection>

          {(app.experienceSummary || app.relevantExperience || app.skills || app.previousVentures) && (
            <ApplicationDetailSection title="Partner Profile">
              <DetailGrid>
                <Detail label="Experience Summary" value={app.experienceSummary} wide />
                <Detail label="Relevant Experience" value={app.relevantExperience} wide />
                <Detail label="Skills" value={app.skills} />
                <Detail label="Previous Ventures" value={app.previousVentures} wide />
              </DetailGrid>
            </ApplicationDetailSection>
          )}

          {(app.linkedinUrl || app.portfolioUrl) && (
            <ApplicationDetailSection title="Links">
              <DetailGrid>
                {app.linkedinUrl && (
                  <Detail label="LinkedIn" value={<a href={app.linkedinUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">{app.linkedinUrl}</a>} />
                )}
                {app.portfolioUrl && (
                  <Detail label="Portfolio" value={<a href={app.portfolioUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">{app.portfolioUrl}</a>} />
                )}
              </DetailGrid>
            </ApplicationDetailSection>
          )}

          {(app.status === 'PENDING' || app.status === 'APPROVED') && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 flex-wrap" onClick={stop}>
              {app.status === 'PENDING' && (
                <button
                  type="button"
                  className="btn-glow btn-glow-sm flex items-center gap-2"
                  onClick={onApprove}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === app.id + 'APPROVED' ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" /> : '★ Shortlist'}
                </button>
              )}
              <button
                type="button"
                className="btn-glow btn-glow-sm bg-gray-900 text-white border-gray-900 flex items-center gap-2"
                onClick={onSelectPartner}
                disabled={actionLoading !== null}
              >
                {actionLoading === `${app.id}SELECT` ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🤝 Select Partner'}
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 border border-red-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={onReject}
                disabled={actionLoading !== null}
              >
                {actionLoading === app.id + 'REJECTED' ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✕ Decline'}
              </button>
            </div>
          )}

          {app.status === 'SELECTED' && (
            <div className="mt-4">
              <PartnershipTimelineCard ventureName={app.venture?.brandDetails?.brandName} partnerName={app.fullName} />
            </div>
          )}

          {app.status === 'REJECTED' && (
            <div className="text-xs text-gray-500 mt-3 px-1">
              This partnership application was declined.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── My Applications (ventures I applied to) ──────────────────────────────────
function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expandedId, setExpandedId]     = useState(null);

  useEffect(() => {
    coVentureAPI.getMyApplications()
      .then(({ data }) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;

  if (applications.length === 0) return (
    <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
      <div className="text-6xl mb-4">🚀</div>
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No partnership applications yet</h3>
      <p className="text-gray-600">Browse co-venture listings and apply to join as a partner or co-founder.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {applications.map(app => {
        const venture = app.venture || {};
        const b = venture.brandDetails || {};
        const s = STATUS_META[app.status] || STATUS_META.PENDING;
        const brandImage = pickMediaUrl(b);
        const equityLabel = formatEquityOfferedPct(
          venture.equityPercentOffered ?? venture.equity_percent_offered,
        );
        const expanded = expandedId === app.id;

        return (
          <div key={app.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <button
              type="button"
              className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50/80 transition-colors"
              onClick={() => setExpandedId(expanded ? null : app.id)}
            >
              {brandImage
                ? <img src={brandImage} alt={b.brandName} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-11 h-11 rounded-xl bg-[#F3FDE8] flex items-center justify-center font-bold text-[#147A43] flex-shrink-0">{b.brandName?.[0] || '?'}</div>
              }
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{b.brandName || 'Unknown Venture'}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {b.industry?.replace(/_/g, ' ')}{equityLabel ? ` · ${equityLabel} equity` : ''}
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                style={{ background: s.bg, color: s.color }}>
                {s.icon} {s.label}
              </div>
              <span className="text-gray-400 text-sm flex-shrink-0">{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/40">
                <ApplicationDetailSection title="Your Application">
                  <DetailGrid>
                    <Detail label="Contribution" value={app.description} wide />
                    <Detail label="Contribution Plan" value={app.contributionPlan} wide />
                    <Detail label="Skills" value={app.skills} />
                    <Detail label="Location" value={app.location} />
                  </DetailGrid>
                </ApplicationDetailSection>
                {app.status === 'SELECTED' && (
                  <PartnershipTimelineCard ventureName={b.brandName} partnerName={app.fullName} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function ApplicationDetailSection({ title, children }) {
  return (
    <section className="mb-4 last:mb-0">
      <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-gray-500 mb-2 m-0">{title}</h4>
      {children}
    </section>
  );
}

function DetailGrid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Detail({ label, value, wide = false }) {
  if (!value) return null;
  return (
    <div className={`rounded-xl border border-gray-100 bg-white px-3 py-2.5 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{value}</div>
    </div>
  );
}

function LikesReceived() {
  const [ventures, setVentures] = useState([]);
  const [likeData, setLikeData] = useState({});
  const [loading, setLoading]   = useState(true);

  const mapLikePayload = (payload) => {
    const next = {};
    Object.entries(payload || {}).forEach(([entityId, value]) => {
      const key = String(entityId).toLowerCase();
      if (typeof value === 'number') {
        next[key] = { liked: false, count: value };
        return;
      }
      next[key] = {
        liked: Boolean(value?.liked),
        count: value?.count ?? value?.total_likes ?? 0,
      };
    });
    return next;
  };

  useEffect(() => {
    ventureAPI.getMyVentures()
      .then(async ({ data }) => {
        const list = asArray(data);
        setVentures(list);
        if (list.length > 0) {
          const ids = list.map((v) => String(v.id));
          const response = await likeAPI.bulkStatus('VENTURE', ids);
          setLikeData(mapLikePayload(unwrapApiData(response)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;

  if (ventures.length === 0) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">❤️</div>
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No ventures listed yet</h3>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {ventures.map(v => {
        const b = v.brandDetails || {};
        const ls = likeData[String(v.id).toLowerCase()] || { liked: false, count: 0 };
        return (
          <div key={v.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-[10px] flex-wrap gap-2 shadow-sm">
            <div>
              <div className="font-semibold text-gray-900">{b.brandName}</div>
              <div className="text-xs text-gray-500 mt-1">
                {b.industry?.replace(/_/g, ' ')}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-400 font-semibold">
                ❤️ {ls.count} like{ls.count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
