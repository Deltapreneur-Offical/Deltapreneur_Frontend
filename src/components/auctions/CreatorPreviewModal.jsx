import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, BadgeCheck, Sparkles, Briefcase, Tag, Target, Building2, Globe, Video, FileText, ExternalLink, ArrowRight, Clock, Star, Gavel, ChevronRight, User2, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { getLinkedInProfileUrl } from '../../utils/creatorProfile';
import { getVisibleCreatorFields } from '../../utils/creatorRoleFields';
import { formatCountdown } from '../../utils/auctionDate';
import { useAuth } from '../../context/AuthContext';
import { PRODUCTION_APP_URL, APP_BASE_URL } from '../../config/urls';
import OverflowMarqueeText from '../common/OverflowMarqueeText';

function LinkedInIcon({ size = 18, className = '', fill = 'none' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function cleanText(value) {
  return String(value || '').trim();
}

function formatLabel(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/_/g, ' ').trim();
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

export default function CreatorPreviewModal({ profile, auction, open, onClose, onPlaceBid, showShareIcon = false }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const dialogRef = useRef(null);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!auction?.endTime) return;
    const updateCountdown = () => {
      const { timeLeft: tl } = formatCountdown(auction.endTime);
      setTimeLeft(tl);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime, open]);

  const community = profile || auction?.community || {};
  const name = cleanText(community.name) || t('listingCardAnonymous');
  const roleLabel = formatLabel(community.role);
  const industryLabel = formatLabel(community.industry);
  const location = cleanText(community.location || '');
  const visibleFields = getVisibleCreatorFields(community.role);
  const isFieldVisible = (fieldName) => visibleFields.includes(fieldName);

  const skills = community.skills
    ? (typeof community.skills[0] === 'object'
       ? community.skills.map((s) => s.skill || s).filter(Boolean)
       : community.skills.split(',').map((s) => s.trim()).filter(Boolean))
    : [];
  const skillLevels = community.skills
    ? (typeof community.skills[0] === 'object'
       ? community.skills.map((s) => s.level || 'INTERMEDIATE')
       : community.skills.split(',').map(() => 'INTERMEDIATE'))
    : [];

  const about = cleanText(community.about || community.bio || community.why_im_here || community.whyImHere || '');
  const whyImHere = cleanText(community.why_im_here || community.whyImHere || '');

  const verified = Boolean(community.isApproved ?? community.is_approved ?? false);
  const featured = Boolean(community.featured ?? auction?.featured ?? false);

  const expectedPrice = cleanText(community.expectedPrice || community.expected_price || community.expectedRate || community.expected_rate || '');
  const preferredWorkType = cleanText(community.preferredWorkType || community.preferred_work_type || '');
  const industryExpertise = cleanText(community.industryExpertise || community.industry_expertise || '');
  const languagesKnown = cleanText(community.languagesKnown || community.languages_known || '');
  const headline = cleanText(community.headline || '');
  const education = cleanText(community.education || '');
  const graduationYear = cleanText(community.graduationYear || community.graduation_year || '');
  const experience = cleanText(community.experience || community.years_experience || '');
  const currentCompany = cleanText(community.currentCompany || community.current_company || '');
  const designation = cleanText(community.designation || '');
  const companyName = cleanText(community.companyName || community.company_name || '');
  const companyWebsite = cleanText(community.companyWebsite || community.company_website || '');
  const availability = cleanText(community.availability || '');
  const hiringFor = cleanText(community.hiringFor || community.hiring_for || '');
  const mentorshipTopics = cleanText(community.mentorshipTopics || community.mentorship_topics || '');
  const investmentFocus = cleanText(community.investmentFocus || community.investment_focus || '');
  const investmentStage = cleanText(community.investmentStage || community.investment_stage || '');
  const ticketSize = cleanText(community.ticketSize || community.ticket_size || '');
  const startupStage = cleanText(community.startupStage || community.startup_stage || '');
  const coFounderNeeds = cleanText(community.coFounderNeeds || community.co_founder_needs || '');
  const incubationPrograms = cleanText(community.incubationPrograms || community.incubation_programs || '');
  const supportOffered = cleanText(community.supportOffered || community.support_offered || '');

  const linkedInUrl = getLinkedInProfileUrl(community);
  const introductionVideoLink = cleanText(community.introductionVideoLink || community.introduction_video_link || '');
  const resumeDriveLink = cleanText(community.resumeDriveLink || community.resume_drive_link || '');
  const portfolioWebsiteLink = cleanText(community.portfolioWebsiteLink || community.portfolio_website_link || '');
  const extraInfoCards = [
    { name: 'headline', label: 'Professional Headline', value: headline, icon: Star },
    { name: 'education', label: 'Education', value: education, icon: User2 },
    { name: 'graduationYear', label: 'Graduation Year', value: graduationYear, icon: Clock },
    { name: 'experience', label: 'Experience', value: experience, icon: Briefcase },
    { name: 'currentCompany', label: 'Current Company', value: currentCompany, icon: Building2 },
    { name: 'designation', label: 'Designation', value: designation, icon: BadgeCheck },
    { name: 'companyName', label: 'Company / Organization', value: companyName, icon: Building2 },
    {
      name: 'companyWebsite',
      label: 'Company Website',
      value: getCleanDisplayLink(companyWebsite),
      icon: Globe,
      isLink: Boolean(companyWebsite),
      linkUrl: companyWebsite,
    },
    { name: 'availability', label: 'Availability', value: availability, icon: Clock },
    { name: 'hiringFor', label: 'Hiring / Collaboration Need', value: hiringFor, icon: Briefcase },
    { name: 'mentorshipTopics', label: 'Mentorship Topics', value: mentorshipTopics, icon: Target },
    { name: 'investmentFocus', label: 'Investment Focus', value: investmentFocus, icon: Sparkles },
    { name: 'investmentStage', label: 'Preferred Investment Stage', value: investmentStage, icon: Gavel },
    { name: 'ticketSize', label: 'Typical Ticket Size', value: ticketSize, icon: Tag },
    { name: 'startupStage', label: 'Startup Stage', value: startupStage, icon: Sparkles },
    { name: 'coFounderNeeds', label: 'Co-founder / Team Need', value: coFounderNeeds, icon: Target },
    { name: 'incubationPrograms', label: 'Incubation Programs', value: incubationPrograms, icon: Building2 },
    { name: 'supportOffered', label: 'Support Offered', value: supportOffered, icon: Star },
  ];

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    queueMicrotask(() => {
      const firstFocusable = dialogRef.current?.querySelector('button,[href],[tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus?.();
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const close = () => onClose?.();

  const handleConnect = () => {
    if (linkedInUrl) {
      window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const shareBase = PRODUCTION_APP_URL.replace(/\/$/, '');
  const shareUrl = `${shareBase}/creator/${community.id || ''}${user?.id ? `?ref=${user.id}` : ''}`;
  const shareSubject = `Check out this creator profile on CoBrother: ${name}`;
  const shareBody = `Check out this creator profile on CoBrother!\n\n${name}\n${linkedInUrl ? `LinkedIn: ${linkedInUrl}` : ''}\n\nView profile:\n${shareUrl}`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareSubject)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShare = `https://x.com/intent/tweet?text=${encodeURIComponent(shareSubject + '\n\n' + shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareSubject + '\n\n' + shareUrl)}`;
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

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Creator preview"
        className="relative flex h-[85vh] w-full max-w-[850px] flex-col overflow-x-hidden overflow-y-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_32px_96px_-16px_rgba(15,23,42,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-6 p-6 md:p-8 bg-white shrink-0">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
              {cleanText(community.imageUrl || community.image_url) ? (
                <img
                  src={community.imageUrl || community.image_url}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-extrabold text-slate-400">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3
                  className="text-xl md:text-[1.65rem] font-extrabold text-slate-900 tracking-tight leading-tight w-full overflow-hidden"
                  style={{
                    textOverflow: 'clip',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  <OverflowMarqueeText text={name} />
                </h3>
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
                {roleLabel ? (
                  <span className="inline-block rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[0.68rem] font-bold uppercase tracking-wider px-3 py-1">
                    {roleLabel}
                  </span>
                ) : null}
                {industryLabel ? (
                  <span className="rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-[0.68rem] font-bold uppercase tracking-wider px-3 py-1">
                    {industryLabel}
                  </span>
                ) : null}
                {location ? (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 ml-1">
                    <MapPin size={15} className="text-slate-400" />
                    {location}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Close creator preview"
          >
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-6 md:px-8 pb-6 md:pb-8 flex-1 bg-white">
          <div className="rounded-[1.25rem] border border-slate-150 p-1 shadow-[0_1px_4px_rgba(15,23,42,0.02)]">
             {isFieldVisible('about') ? (
              <InfoCard
                label="About"
                value={about}
                icon={User2}
              />
             ) : null}
             {extraInfoCards
              .filter((field) => isFieldVisible(field.name))
              .map((field) => (
                <InfoCard
                  key={field.name}
                  label={field.label}
                  value={field.value}
                  icon={field.icon}
                  isLink={field.isLink}
                  linkUrl={field.linkUrl}
                />
              ))}
             {isFieldVisible('whyImHere') ? (
              <InfoCard
                label="Why I'm Here"
                value={whyImHere}
                icon={Target}
              />
             ) : null}
             {isFieldVisible('introductionVideoLink') ? (
              <InfoCard
                label="Introduction Video"
                value={getCleanDisplayLink(introductionVideoLink)}
                icon={Video}
                isLink={Boolean(introductionVideoLink)}
                linkUrl={introductionVideoLink}
              />
             ) : null}
 {isFieldVisible('expectedPriceAmount') ? (
                 <InfoCard
                  label={(community.role === 'JOB_SEEKER' || community.role === 'EMPLOYEE') ? 'Expected Compensation' : 'Expected Price'}
                  value={expectedPrice}
                  icon={Tag}
                />
               ) : null}
             {isFieldVisible('resumeDriveLink') ? (
              <InfoCard
                label="Resume (PDF)"
                value={getCleanDisplayLink(resumeDriveLink)}
                icon={FileText}
                isLink={Boolean(resumeDriveLink)}
                linkUrl={resumeDriveLink}
                border={true}
              />
             ) : null}
             {isFieldVisible('preferredWorkType') ? (
              <InfoCard
                label="Preferred Work Type"
                value={preferredWorkType ? preferredWorkType.replace(/_/g, ' ') : ''}
                icon={Briefcase}
              />
             ) : null}
             {isFieldVisible('portfolioWebsiteLink') ? (
              <InfoCard
                label="Portfolio Website"
                value={getCleanDisplayLink(portfolioWebsiteLink)}
                icon={Globe}
                isLink={Boolean(portfolioWebsiteLink)}
                linkUrl={portfolioWebsiteLink}
              />
             ) : null}
             {isFieldVisible('industryExpertise') ? (
              <InfoCard
                label="Industry Expertise"
                value={industryExpertise}
                icon={Building2}
              />
             ) : null}
             {isFieldVisible('languagesKnown') ? (
              <InfoCard
                label="Languages Known"
                value={languagesKnown}
                icon={Globe}
                border={false}
              />
             ) : null}
          </div>

{isFieldVisible('skills') && skills.length > 0 && (
             <div className="mt-5 rounded-[1.25rem] border border-slate-150 p-6 shadow-[0_1px_4px_rgba(15,23,42,0.02)] bg-white">
               <div className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500 mb-3.5">
                 Skills
               </div>
               <div className="flex flex-wrap gap-2">
                 {skills.map((skill, idx) => {
                   const level = skillLevels[idx] || 'INTERMEDIATE';
                   const levelColors = {
                     BEGINNER: 'bg-slate-50 border-slate-200 text-slate-600',
                     INTERMEDIATE: 'bg-blue-50 border-blue-200 text-blue-600',
                     ADVANCED: 'bg-indigo-50 border-indigo-200 text-indigo-600',
                     EXPERT: 'bg-purple-50 border-purple-200 text-purple-600',
                   };
                   return (
                     <span
                       key={`${skill}-${idx}`}
                       className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-default ${levelColors[level] || 'bg-slate-50/50'}`}
                     >
                       {skill}
                     </span>
                   );
                 })}
               </div>
             </div>
           )}
        </div>

        {/* Footer Section */}
        {auction ? (
          <div className="border-t border-slate-150 bg-white p-6 md:px-8 md:py-6 shadow-[0_-8px_32px_rgba(15,23,42,0.04)] shrink-0 flex flex-col gap-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
              <div className="px-3 py-2 text-center md:text-left border-r border-slate-100">
                <div className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-slate-400 flex items-center gap-1.5 justify-center md:justify-start">
                  <Tag size={11} className="text-slate-400" /> Starting Bid
                </div>
                <div className="mt-1 text-base font-extrabold text-slate-800 tracking-tight">
                  {formatPrice(auction.minBidPrice ?? 0)}
                </div>
              </div>
              <div className="px-3 py-2 text-center md:text-left border-r border-slate-100">
                <div className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-slate-400 flex items-center gap-1.5 justify-center md:justify-start">
                  <Gavel size={11} className="text-slate-400" /> Total Bids
                </div>
                <div className="mt-1 text-base font-extrabold text-slate-800 tracking-tight">
                  {auction.totalBids ?? 0}
                </div>
              </div>
              <div className="px-3 py-2 text-center md:text-left border-r border-slate-100">
                <div className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-slate-400 flex items-center gap-1.5 justify-center md:justify-start">
                  <Clock size={11} className="text-slate-400" /> Ends In
                </div>
                <div className={`mt-1 text-base font-extrabold tracking-tight ${timeLeft === 'Ended' ? 'text-rose-500' : 'text-amber-600'}`}>
                  {timeLeft || '—'}
                </div>
              </div>
              <div className="px-3 py-2 text-center md:text-left">
                <div className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-slate-400 flex items-center gap-1.5 justify-center md:justify-start">
                  <Star size={11} className="text-slate-450" /> Current Bid
                </div>
                <div className="mt-1 text-base font-extrabold text-emerald-600 tracking-tight">
                  {auction.currentHighestBid > 0
                    ? formatPrice(auction.currentHighestBid)
                    : 'No bids yet'}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center gap-4">
              <button
                type="button"
                onClick={close}
                className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md hover:border-slate-400 hover:-translate-y-0.5 active:translate-y-0"
              >
                Close
              </button>
              {onPlaceBid && (
                <button
                  type="button"
                  onClick={onPlaceBid}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-[0_2px_4px_rgba(79,70,229,0.2)] hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-650/30 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Place Bid <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            {/* Close Button */}
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md active:translate-y-0 sm:w-auto sm:px-6"
            >
              Close
            </button>

            {/* Right side container */}
            <div className="flex w-full min-w-0 flex-wrap items-center justify-stretch gap-2 sm:w-auto sm:justify-end sm:gap-2.5">
              {/* Share Icon (Creators page only) */}
              {showShareIcon && (
                <div className="relative shrink-0" ref={shareRef}>
                  <button
                    type="button"
                    onClick={toggleShare}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
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
              )}

              {/* Connect Button */}
              <button
                type="button"
                onClick={handleConnect}
                disabled={!linkedInUrl}
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-700 shadow-sm transition-all duration-300 sm:flex-none sm:gap-3 sm:px-5 ${linkedInUrl
                  ? 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md active:translate-y-0'
                  : 'cursor-not-allowed opacity-50'
                  }`}
              >
                {/* LinkedIn Box */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#0A66C2] text-[13px] font-bold text-white sm:h-8 sm:w-8 sm:text-[15px]">
                  in
                </span>

                <span className="text-sm font-bold">
                  Connect
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
