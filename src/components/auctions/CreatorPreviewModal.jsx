import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X, MapPin, BadgeCheck, Sparkles, Clock, Briefcase, Star, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCompactCountdown } from '../../utils/auctionDate';
import { resolveAuctionListerName } from '../../utils/auctionLister';

function cleanText(value) {
  return String(value || '').trim();
}

function splitList(value) {
  return cleanText(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeSkills(auction, community) {
  const raw = (
    auction?.auctionSkills
    ?? auction?.auction_skills
    ?? community?.skills
    ?? community?.expertise
    ?? community?.tags
    ?? ''
  );
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (item && typeof item === 'object') {
          return cleanText(item.label ?? item.name ?? item.value ?? '');
        }
        return cleanText(item);
      })
      .filter(Boolean)
      .slice(0, 10);
  }
  return String(raw)
    .split(/[,\n|]/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function readProjects(community) {
  const source = [
    community?.projects,
    community?.portfolioProjects,
    community?.portfolio_projects,
    community?.caseStudies,
    community?.case_studies,
    community?.workSamples,
    community?.work_samples,
  ].find(Boolean);

  if (!source) return [];

  const items = Array.isArray(source) ? source : splitList(source);
  return items.slice(0, 2).map((item, index) => {
    if (typeof item === 'string') {
      return { id: `${index}-${item}`, name: item, description: '', imageUrl: '' };
    }
    return {
      id: item.id ?? item.projectId ?? item.project_id ?? `${index}`,
      name: item.name ?? item.projectName ?? item.project_name ?? `Project ${index + 1}`,
      description: item.description ?? item.summary ?? item.tagline ?? '',
      imageUrl: item.imageUrl ?? item.image_url ?? item.thumbnail ?? item.thumbnailUrl ?? '',
    };
  });
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex min-h-[72px] items-start gap-3 rounded-[18px] border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      {Icon ? (
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-[#E5E7EB]">
          <Icon size={14} />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function CreatorPreviewModal({ auction, open, onClose, onPlaceBid }) {
  const { t } = useTranslation();
  const [expandedAbout, setExpandedAbout] = useState(false);
  const dialogRef = useRef(null);

  const community = auction?.community || {};
  const listerName = resolveAuctionListerName(auction) || cleanText(community.name) || t('listingCardAnonymous');
  const headline = cleanText(community.role || community.industry || community.headline || '');
  const location = cleanText(community.location || '');
  const skills = normalizeSkills(auction, community);
  const lookingFor = splitList(community.lookingFor || community.looking_for || community.openTo || community.open_to || community.seeking || '');
  const about = cleanText(community.whyImHere || community.why_im_here || community.bio || community.description || '');
  const verified = Boolean(community.isApproved ?? community.is_approved ?? auction?.community?.isApproved ?? false);
  const featured = Boolean(auction?.featured || community?.featured);
  const projects = useMemo(() => readProjects(community), [community]);
  const moreProjects = Math.max(0, Number(community.projectCount ?? community.project_count ?? projects.length) - 2);
  const startingBid = Number(auction?.minBidPrice ?? 0);
  const currentBid = Number(auction?.currentHighestBid ?? 0);
  const timeLeft = formatCompactCountdown(auction?.endTime).timeLeft;
  const availability = cleanText(community.availability || community.status || 'Available');
  const years = cleanText(community.yearsOfExperience || community.years_of_experience || '');
  const projectCount = cleanText(community.projectCount || community.project_count || '');
  const introductionVideoLink = cleanText(community.introductionVideoLink || community.introduction_video_link || '');
  const resumeDriveLink = cleanText(community.resumeDriveLink || community.resume_drive_link || '');
  const portfolioWebsiteLink = cleanText(community.portfolioWebsiteLink || community.portfolio_website_link || '');
  const preferredWorkType = cleanText(community.preferredWorkType || community.preferred_work_type || '');
  const industryExpertise = cleanText(community.industryExpertise || community.industry_expertise || '');
  const languagesKnown = cleanText(community.languagesKnown || community.languages_known || '');

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

  useEffect(() => {
    if (!open) setExpandedAbout(false);
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const close = () => onClose?.();
  const placeBid = () => onPlaceBid?.();

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[6px]"
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
        className="w-full max-w-[540px] overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] animate-[creatorModalIn_220ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-bold text-slate-700 ring-1 ring-[#E5E7EB]">
              {cleanText(community.imageUrl || community.image_url) ? (
                <img
                  src={community.imageUrl || community.image_url}
                  alt={listerName}
                  className="h-full w-full object-cover"
                />
              ) : (
                listerName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-[1.05rem] font-semibold text-slate-900">
                  {listerName}
                </h3>
                {verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-semibold text-emerald-700">
                    <BadgeCheck size={11} />
                    Verified
                  </span>
                ) : null}
                {featured ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-[#F8F9FA] px-2 py-0.5 text-[0.68rem] font-semibold text-slate-700">
                    <Sparkles size={11} />
                    Featured
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {headline || 'Creator profile'}
              </p>
              {location ? (
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={12} />
                  {location}
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 hover:scale-105"
            aria-label="Close creator preview"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {about ? (
              <section>
                <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  About
                </div>
                <p className={`${expandedAbout ? '' : 'line-clamp-4'} text-sm leading-6 text-slate-700`}>
                  {about}
                </p>
                {about.length > 180 ? (
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
                    onClick={() => setExpandedAbout((v) => !v)}
                  >
                    {expandedAbout ? 'Show less' : 'Read more'}
                  </button>
                ) : null}
              </section>
            ) : null}

            {skills.length > 0 ? (
              <section>
                <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Expertise
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-slate-200 bg-[#F8F9FA] px-3 py-1 text-xs font-medium text-slate-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <StatCard label="Experience" value={years || '—'} icon={Clock} />
              <StatCard label="Projects" value={projectCount || projects.length || '—'} icon={Briefcase} />
              <StatCard label="Availability" value={availability} icon={Sparkles} />
            </section>

            {lookingFor.length > 0 ? (
              <section>
                <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Looking For
                </div>
                <div className="flex flex-wrap gap-2">
                  {lookingFor.map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 bg-[#F8F9FA] px-3 py-1 text-xs font-semibold text-slate-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {preferredWorkType ? (
              <section>
                <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Preferred Work Type
                </div>
                <div className="rounded-full border border-slate-200 bg-[#F8F9FA] px-3 py-1 text-xs font-semibold text-slate-700">
                  {preferredWorkType.replace(/_/g, ' ')}
                </div>
              </section>
            ) : null}

            {industryExpertise ? (
              <section>
                <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Industry Expertise
                </div>
                <div className="text-sm text-slate-700">
                  {industryExpertise}
                </div>
              </section>
            ) : null}

            {languagesKnown ? (
              <section>
                <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Languages Known
                </div>
                <div className="flex flex-wrap gap-2">
                  {languagesKnown.split(',').map((lang, idx) => (
                    <span key={idx} className="rounded-full border border-slate-200 bg-[#F8F9FA] px-3 py-1 text-xs font-medium text-slate-700">
                      {lang.trim()}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {introductionVideoLink || resumeDriveLink || portfolioWebsiteLink ? (
              <section>
                <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Links & Resources
                </div>
                <div className="space-y-2">
                  {introductionVideoLink && (
                    <a href={introductionVideoLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 transition-colors">
                      🎥 Introduction Video
                    </a>
                  )}
                  {resumeDriveLink && (
                    <a href={resumeDriveLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 transition-colors">
                      📄 Resume
                    </a>
                  )}
                  {portfolioWebsiteLink && (
                    <a href={portfolioWebsiteLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 transition-colors">
                      🌐 Portfolio
                    </a>
                  )}
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Portfolio Preview
                </div>
                {moreProjects > 0 ? (
                  <div className="text-xs font-medium text-slate-500">
                    + {moreProjects} More Projects
                  </div>
                ) : null}
              </div>
              {projects.length > 0 ? (
                <div className="space-y-2">
                  {projects.slice(0, 2).map((project) => (
                    <div key={project.id} className="flex gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                        {project.imageUrl ? (
                          <img src={project.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{project.name}</div>
                        <div className="line-clamp-2 text-xs leading-5 text-slate-500">
                          {project.description || 'Recent work preview'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#E5E7EB] px-4 py-4 text-sm text-slate-500">
                  Portfolio preview will appear here when project data is available.
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] bg-white px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Starting Bid" value={`₹${Number(startingBid).toLocaleString('en-IN')}`} icon={Tag} />
            <StatCard label="Current Bid" value={currentBid > 0 ? `₹${Number(currentBid).toLocaleString('en-IN')}` : 'No bids yet'} icon={Star} />
            <StatCard label="Time Left" value={timeLeft} icon={Clock} />
          </div>
          <button
            type="button"
            onClick={placeBid}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg"
          >
            Place Bid
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
