import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin,
  BadgeCheck,
  Sparkles,
  Briefcase,
  Tag,
  Globe,
  FileText,
  ExternalLink,
  ArrowRight,
  Clock,
  User2,
  Share2,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { PRODUCTION_APP_URL } from '../../config/urls';
import { SUPPORT_PHONE_TEL } from '../../config/contactLinks';
import { getVirtualAssistantDetailPath } from '../../utils/listingNavigation';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import VaProfilePhoto from './VaProfilePhoto';

function cleanText(value) {
  return String(value || '').trim();
}

function formatLabel(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/_/g, ' ').replace(/-/g, ' ').trim();
}

function formatTitleCase(value) {
  const label = formatLabel(value);
  if (!label) return '';
  return label.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCleanDisplayLink(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname.slice(0, 15) + (parsed.pathname.length > 15 ? '...' : '');
  } catch {
    return url.slice(0, 30) + (url.length > 30 ? '...' : '');
  }
}

function InfoCard({ label, value, icon: Icon, isLink, linkUrl, border = true }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-4 md:py-5 ${border ? 'border-b border-slate-100' : ''}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </div>
        <div className="mt-1 text-[0.95rem] font-medium text-slate-800 break-words leading-relaxed">
          {isLink && linkUrl ? (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 hover:underline break-all"
            >
              {value}
              <ExternalLink size={14} className="shrink-0" />
            </a>
          ) : (
            value || 'Not provided'
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-slate-400 pr-2">
        <ChevronRight size={20} />
      </div>
    </div>
  );
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getApprovedRoles(profile) {
  const fromApplicationRoles = (profile.applicationRoles || [])
    .filter((role) => role.status === 'approved')
    .map((role) => role.roleName)
    .filter(Boolean);
  if (fromApplicationRoles.length > 0) return fromApplicationRoles;
  return parseList(profile.roles);
}

function getAvailabilityLabel(profile) {
  const approvedRoles = (profile.applicationRoles || []).filter((role) => role.status === 'approved');
  if (approvedRoles.length > 0) {
    const role = approvedRoles[0];
    const max = role.maxClients;
    const current = role.currentClients || 0;
    if (max != null && current >= max) return 'Not available';
    if (role.availabilityStatus === 'limited') return 'Limited availability';
    if (role.availabilityStatus === 'available') return 'Available';
  }
  return formatTitleCase(profile.availability) || 'Not provided';
}

function getWorkTypeLabel(profile) {
  const hours = cleanText(profile.hoursPerWeek);
  if (hours) return hours.includes('hour') ? hours : `${hours} hours/week`;
  return formatTitleCase(profile.availability) || 'Not provided';
}

export default function VirtualAssistantPreviewPanel({
  profile,
  onClose,
  showShareIcon = true,
  hireIntent = false,
  embedded = false,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const shareRef = useRef(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const name = cleanText(profile?.fullName) || t('listingCardAnonymous', { defaultValue: 'Anonymous' });
  const approvedRoles = getApprovedRoles(profile);
  const primaryRole = approvedRoles[0] || 'Virtual Assistant';
  const location = cleanText(profile?.location);
  const about = cleanText(profile?.bio);
  const languagesKnown = parseList(profile?.languagesKnown).join(', ');
  const skills = parseList(profile?.skills);
  const experience = cleanText(profile?.yearsExperience);
  const availability = getAvailabilityLabel(profile);
  const workType = getWorkTypeLabel(profile);
  const linkedInUrl = cleanText(profile?.linkedinUrl);
  const portfolioUrl = cleanText(profile?.portfolioUrl);
  const featured = Boolean(profile?.featured);
  const verified = approvedRoles.length > 0;
  const monthlyPrice = profile?.publicMonthlyPriceInr;
  const priceLabel = monthlyPrice != null && monthlyPrice !== ''
    ? `${formatPrice(Number(monthlyPrice))} / month`
    : 'Price on request';

  const handleConnect = () => {
    if (linkedInUrl) {
      window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleHire = () => {
    // Prefer Gmail compose in a new tab — mailto: fails in Chrome Network when no
    // desktop mail client is configured (common on Windows / localhost).
    const subject = `Hire Virtual Assistant: ${name}`;
    const profilePath = getVirtualAssistantDetailPath(profile?.id, { intent: 'hire' });
    const profileUrl = `${PRODUCTION_APP_URL.replace(/\/$/, '')}${profilePath}`;
    const body =
      `Hello CoBrother team,\n\nI would like to hire ${name} (${primaryRole}).\n\nProfile: ${profileUrl}\n\nThank you.`;
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent('support@cobrother.com')}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    const opened = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href =
        `mailto:support@cobrother.com` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
    }
  };

  const shareBase = PRODUCTION_APP_URL.replace(/\/$/, '');
  const shareUrl = `${shareBase}/operations/${profile?.id || ''}${user?.id ? `?ref=${user.id}` : ''}`;
  const shareSubject = `Check out this virtual assistant on CoBrother: ${name}`;
  const shareBody = `Check out this virtual assistant on CoBrother!\n\n${name}\n${linkedInUrl ? `LinkedIn: ${linkedInUrl}` : ''}\n\nView profile:\n${shareUrl}`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareSubject)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShare = `https://x.com/intent/tweet?text=${encodeURIComponent(`${shareSubject}\n\n${shareUrl}`)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`${shareSubject}\n\n${shareUrl}`)}`;
  const gmailShare = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
  const emailShare = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
  const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareSubject)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
    setShareOpen(false);
  };

  const toggleShare = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareSubject,
          text: shareSubject,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        } else {
          return;
        }
      }
    }
    if (!shareOpen && shareRef.current) {
      const rect = shareRef.current.getBoundingClientRect();
      let left = rect.right + window.scrollX - 200;
      if (left < 10) left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY;
      if (rect.bottom + 270 > window.innerHeight) {
        top = rect.top + window.scrollY - 270;
      }
      setCoords({ top, left });
    }
    setShareOpen(!shareOpen);
  };

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const rootClassName = embedded
    ? 'relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white'
    : 'relative w-full max-w-[850px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_32px_96px_-16px_rgba(15,23,42,0.16)] flex flex-col';

  return (
    <div className={rootClassName}>
      <div
        className="relative h-36 md:h-44 shrink-0 overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #60A5FA 0%, #93C5FD 42%, #BFDBFE 100%)',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgba(255,255,255,0.55),transparent_52%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_80%,rgba(96,165,250,0.35),transparent_48%)] backdrop-blur-[2px]" />
        <div className="absolute inset-x-0 bottom-0 h-20 md:h-24 bg-gradient-to-t from-white via-white/85 to-transparent" />
      </div>

      <div className="relative px-6 md:px-8 pb-2 -mt-16 shrink-0">
        <div className="flex min-w-0 items-end gap-5">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-50 shadow-lg">
            <VaProfilePhoto
              source={profile}
              applicationId={profile?.id}
              refreshScope="public"
              alt={name}
              className="h-full w-full object-cover"
              fallbackClassName="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-extrabold text-slate-400"
              fallback="initial"
            />
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                className="text-xl md:text-[1.65rem] font-extrabold text-slate-900 tracking-tight leading-tight w-full overflow-hidden"
                style={{
                  textOverflow: 'clip',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                <OverflowMarqueeText text={name} />
              </h1>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-600 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <BadgeCheck size={13} />
                  Verified
                </span>
              ) : null}
              {featured ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-600 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <Sparkles size={13} className="text-amber-500 fill-amber-500" />
                  Featured
                </span>
              ) : null}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              {approvedRoles.map((role) => (
                <span
                  key={role}
                  className="inline-block rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[0.68rem] font-bold uppercase tracking-wider px-3 py-1"
                >
                  {role}
                </span>
              ))}
              {location ? (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 ml-1">
                  <MapPin size={15} className="text-slate-400" />
                  {location}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto px-6 md:px-8 pb-6 md:pb-8 flex-1 bg-white">
        <div className="rounded-[1.25rem] border border-slate-150 p-1 shadow-[0_1px_4px_rgba(15,23,42,0.02)]">
          <InfoCard label="Monthly Price" value={priceLabel} icon={Tag} />
          <InfoCard label="Experience" value={experience} icon={Briefcase} />
          <InfoCard label="Availability" value={availability} icon={Clock} />
          <InfoCard label="Work Type" value={workType} icon={Briefcase} />
          <InfoCard label="About" value={about} icon={User2} />
          <InfoCard label="Languages Known" value={languagesKnown} icon={Globe} />
          {portfolioUrl ? (
            <InfoCard
              label="Portfolio"
              value={getCleanDisplayLink(portfolioUrl)}
              icon={Globe}
              isLink
              linkUrl={portfolioUrl}
            />
          ) : null}
          {linkedInUrl ? (
            <InfoCard
              label="LinkedIn"
              value={getCleanDisplayLink(linkedInUrl)}
              icon={FileText}
              isLink
              linkUrl={linkedInUrl}
              border={false}
            />
          ) : null}
        </div>

        {skills.length > 0 ? (
          <div className="mt-5 rounded-[1.25rem] border border-slate-150 p-6 shadow-[0_1px_4px_rgba(15,23,42,0.02)] bg-white">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500 mb-3.5">
              Skills
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span
                  key={`${skill}-${idx}`}
                  className="rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-default bg-indigo-50 border-indigo-200 text-indigo-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50/50 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md hover:border-slate-400 hover:-translate-y-0.5 active:translate-y-0"
        >
          Back
        </button>

        <div className="flex items-center justify-end gap-3.5">
          {showShareIcon ? (
            <div className="relative" ref={shareRef}>
              <button
                type="button"
                onClick={toggleShare}
                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-[14px] text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                title="Share"
                aria-expanded={shareOpen}
                aria-haspopup="menu"
              >
                <Share2 size={18} />
              </button>
              {shareOpen && createPortal(
                <div
                  className="fixed z-[9999] w-[200px] bg-white border border-slate-100 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)] overflow-hidden text-gray-900"
                  style={{
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                  }}
                >
                  <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Share via</span>
                  </div>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleShare(linkedinShare)}>
                    LinkedIn
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleShare(facebookShare)}>
                    Facebook
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleShare(twitterShare)}>
                    Twitter / X
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleShare(whatsappShare)}>
                    WhatsApp
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleShare(gmailShare)}>
                    Gmail
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleShare(emailShare)}>
                    Email
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleShare(telegramShare)}>
                    Telegram
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={handleCopyLink}>
                    Copy Link
                  </button>
                </div>,
                document.body,
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleConnect}
            disabled={!linkedInUrl}
            className={`px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center gap-3 shadow-sm transition-all duration-300 ${linkedInUrl
              ? 'hover:bg-slate-50 hover:shadow-md hover:border-slate-450 hover:-translate-y-0.5 cursor-pointer active:translate-y-0'
              : 'opacity-50 cursor-not-allowed'
              }`}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#0A66C2] text-white text-[15px] font-bold transition-all duration-300">
              in
            </span>
            <span className="text-sm font-bold">Connect</span>
          </button>

          <button
            type="button"
            onClick={hireIntent ? handleHire : () => { window.location.href = SUPPORT_PHONE_TEL; }}
            className={`px-6 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition-all shadow-[0_2px_4px_rgba(79,70,229,0.2)] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${hireIntent ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-650/30' : 'bg-purple-600 hover:bg-purple-700 hover:shadow-purple-650/30'}`}
          >
            {hireIntent ? 'Hire Virtual Assistant' : 'Contact'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
