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
  ArrowLeft,
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
    <div className={`flex items-center gap-3 px-3.5 py-3.5 sm:gap-4 sm:px-4 sm:py-4 md:py-5 ${border ? 'border-b border-slate-100' : ''}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 sm:h-12 sm:w-12">
        <Icon size={20} strokeWidth={1.75} className="sm:h-[22px] sm:w-[22px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[0.68rem]">
          {label}
        </div>
        <div className="mt-0.5 break-words text-sm font-medium leading-relaxed text-slate-800 sm:mt-1 sm:text-[0.95rem]">
          {isLink && linkUrl ? (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 break-all text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              <span className="min-w-0 truncate">{value}</span>
              <ExternalLink size={14} className="shrink-0" />
            </a>
          ) : (
            value || 'Not provided'
          )}
        </div>
      </div>
      <div className="shrink-0 pr-0.5 text-slate-300 sm:pr-2">
        <ChevronRight size={18} className="sm:h-5 sm:w-5" />
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
      `Hello Deltapreneur team,\n\nI would like to hire ${name} (${primaryRole}).\n\nProfile: ${profileUrl}\n\nThank you.`;
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent('support@deltapreneur.com')}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    const opened = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href =
        `mailto:support@deltapreneur.com` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
    }
  };

  const shareBase = PRODUCTION_APP_URL.replace(/\/$/, '');
  const shareUrl = `${shareBase}/operations/${profile?.id || ''}${user?.id ? `?ref=${user.id}` : ''}`;
  const shareSubject = `Check out this virtual assistant on Deltapreneur: ${name}`;
  const shareBody = `Check out this virtual assistant on Deltapreneur!\n\n${name}\n${linkedInUrl ? `LinkedIn: ${linkedInUrl}` : ''}\n\nView profile:\n${shareUrl}`;

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
          text: `${shareSubject}\n\n${shareUrl}`,
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

      <div className="relative -mt-14 shrink-0 px-4 pb-3 sm:-mt-16 sm:px-6 md:px-8">
        <div className="flex min-w-0 items-end gap-3 sm:gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-50 shadow-lg sm:h-28 sm:w-28">
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

          <div className="min-w-0 flex-1 pb-1 sm:pb-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700">
                  <BadgeCheck size={12} className="shrink-0" />
                  Verified
                </span>
              ) : null}
              {featured ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
                  <Sparkles size={12} className="shrink-0 fill-amber-500 text-amber-500" />
                  Featured
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
              {approvedRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex max-w-full items-center truncate rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-indigo-600 sm:px-3 sm:text-[0.68rem]"
                >
                  {role}
                </span>
              ))}
            </div>

            {location ? (
              <div className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-500">
                <MapPin size={14} className="shrink-0 text-slate-400" />
                <span className="truncate">{location}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Full-width name marquee — uses entire card width, not just space beside photo */}
        <h1 className="mt-3 w-full min-w-0 overflow-hidden font-display text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:mt-3.5 sm:text-2xl md:text-[1.65rem]">
          <OverflowMarqueeText text={name} className="block w-full min-w-0" />
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
        <div className="rounded-[1.25rem] border border-slate-200/80 bg-white p-0.5 shadow-[0_1px_4px_rgba(15,23,42,0.03)] sm:p-1">
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

      <div className="flex shrink-0 flex-col gap-2.5 border-t border-slate-100 bg-slate-50/80 px-4 py-3.5 sm:gap-3 sm:px-6 sm:py-4">
        {/* Primary CTA — full width where Back used to sit */}
        <button
          type="button"
          onClick={hireIntent ? handleHire : () => { window.location.href = SUPPORT_PHONE_TEL; }}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-[0_2px_8px_rgba(79,70,229,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
            hireIntent ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          <span>{hireIntent ? 'Hire Virtual Assistant' : 'Contact'}</span>
          <ArrowRight size={16} className="shrink-0" />
        </button>

        {/* Secondary actions: Share · Connect · Back (icon only) */}
        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-2.5">
          {showShareIcon ? (
            <div className="relative shrink-0" ref={shareRef}>
              <button
                type="button"
                onClick={toggleShare}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                title="Share"
                aria-label="Share"
                aria-expanded={shareOpen}
                aria-haspopup="menu"
              >
                <Share2 size={18} />
              </button>
              {shareOpen && createPortal(
                <div
                  className="fixed z-[9999] w-[200px] overflow-hidden rounded-2xl border border-slate-100 bg-white text-gray-900 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)]"
                  style={{
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                  }}
                >
                  <div className="border-b border-slate-50 bg-slate-50/50 px-4 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Share via</span>
                  </div>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={() => handleShare(linkedinShare)}>
                    LinkedIn
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={() => handleShare(facebookShare)}>
                    Facebook
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={() => handleShare(twitterShare)}>
                    Twitter / X
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={() => handleShare(whatsappShare)}>
                    WhatsApp
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={() => handleShare(gmailShare)}>
                    Gmail
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={() => handleShare(emailShare)}>
                    Email
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={() => handleShare(telegramShare)}>
                    Telegram
                  </button>
                  <button type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900" onClick={handleCopyLink}>
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
            className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-slate-700 shadow-sm transition-all duration-300 sm:px-5 ${
              linkedInUrl
                ? 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:translate-y-0'
                : 'cursor-not-allowed opacity-50'
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0A66C2] text-[13px] font-bold leading-none text-white">
              in
            </span>
            <span className="text-sm font-bold tracking-tight">Connect</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:translate-y-0"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
