import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight, Loader2, RefreshCw, Search } from 'lucide-react';
import TopNavbar from '../components/common/TopNavbar';
import HomeNavbar from '../components/common/HomeNavbar';
import HomeFooter from '../components/common/HomeFooter';
import useHomePageScrollNav from '../hooks/useHomePageScrollNav';
import { sharesAPI, referralsAPI, likeAPI } from '../api/services';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import AddToCartButton from '../components/cart/AddToCartButton';
import LikeButton from '../components/common/LikeButton';
import { domainRegistrationCartProps } from '../utils/domainRegistrationCart';
import RegistryPremiumBadge from '../components/domain/RegistryPremiumBadge';
import RegistryStandardBadge from '../components/domain/RegistryStandardBadge';
import ShareButton from '../components/share/ShareButton';

function splitDomain(domain) {
  const idx = domain.indexOf('.');
  if (idx <= 0) return { name: domain, tld: '' };
  return { name: domain.slice(0, idx), tld: domain.slice(idx + 1) };
}

const SUGGESTED_TLDS = ['com', 'in', 'net', 'org', 'io', 'ai'];

/** Scoped loading + entrance animations (shimmer sweep, live-check pulse,
 *  subtle fade-and-rise reveal with stagger). Honors prefers-reduced-motion. */
const CB_SHARED_STYLES = `
@keyframes cb-shimmer-sweep {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes cb-live-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.35); opacity: 1; }
}
@keyframes cb-reveal-up {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.cb-shared-skel {
  background: linear-gradient(
    90deg,
    rgba(209, 213, 219, 0.55) 0%,
    rgba(243, 244, 246, 0.95) 40%,
    rgba(229, 231, 235, 0.9) 50%,
    rgba(243, 244, 246, 0.95) 60%,
    rgba(209, 213, 219, 0.55) 100%
  );
  background-size: 200% 100%;
  animation: cb-shimmer-sweep 1.5s ease-in-out infinite;
}
.cb-shared-live-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #0ea5e9;
  animation: cb-live-pulse 1.2s ease-in-out infinite;
}
.cb-reveal {
  opacity: 0;
  animation: cb-reveal-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.cb-reveal--delay-1 { animation-delay: 90ms; }
@media (prefers-reduced-motion: reduce) {
  .cb-shared-skel, .cb-shared-live-dot { animation: none; }
  .cb-reveal { animation: none; opacity: 1 !important; transform: none !important; }
}
`;

function StatusPill({ availability }) {
  const status = availability?.status;
  if (status === 'available') {
    return (
      <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        ✓ Available
      </span>
    );
  }
  if (status === 'marketplace') {
    return (
      <span className="inline-flex w-fit items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
        Marketplace
      </span>
    );
  }
  if (status === 'check_failed') {
    return (
      <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        Availability check pending
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
      Taken
    </span>
  );
}

/**
 * Public shared-domain page — full Deltapreneur page (real header + footer) with a
 * desktop two-column layout: the shared domain card (focus) on the left and an
 * "Explore more" continuation panel on the right (stacked on mobile). Resolves
 * the share token, records the referral once (server dedupes), and re-runs a
 * LIVE registrar check on every open. Opening/sharing never requires login;
 * Add to Cart and Like redirect to login when unauthenticated.
 */
export default function SharedDomainPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { formatDomainPrice } = useCurrency();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const trackedRef = useRef(false);

  // Same header shell as the homepage (TopNavbar + HomeNavbar).
  const [openDropdown, setOpenDropdown] = useState(null);
  const { isScrolled, navRef } = useHomePageScrollNav();

  useEffect(() => {
    const handleClickOutside = (e) => {
      const target = e.target;
      if (navRef.current?.contains(target)) return;
      if (target.closest?.('[data-home-nav-dropdown]')) return;
      setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [navRef]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    sharesAPI
      .getPreview(token)
      .then(({ data: res }) => {
        if (cancelled) return;
        setData(res?.data || null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        setError(
          status === 404
            ? 'This share link is no longer available.'
            : 'We could not load this shared domain right now. Please try again later.',
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Fire-and-forget referral tracking — exactly once per page mount. The
  // backend dedupes atomically, so repeats/concurrent opens never double-award.
  useEffect(() => {
    if (!token || trackedRef.current) return;
    trackedRef.current = true;
    referralsAPI
      .track({ share_token: token })
      .catch((err) => {
        // Referral tracking must never break the preview experience.
        console.debug('[SharedDomainPage] referral track skipped:', err?.response?.status || err?.message);
      });
  }, [token]);

  const retry = useCallback(() => {
    setLoading(true);
    setError('');
    sharesAPI
      .getPreview(token)
      .then(({ data: res }) => setData(res?.data || null))
      .catch(() =>
        setError('We could not load this shared domain right now. Please try again later.'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const handleLike = useCallback(async () => {
    if (!user) {
      const current = typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '/';
      navigate(`/login?redirect=${encodeURIComponent(current)}`);
      return;
    }
    if (!data?.domain) return;
    const res = await likeAPI.toggle('DOMAIN', data.domain);
    const payload = res?.data?.data ?? res?.data ?? {};
    setLiked(Boolean(payload.liked ?? !liked));
    setLikeCount(Number(payload.total_likes ?? payload.count ?? likeCount));
  }, [user, data, liked, likeCount, navigate]);

  const { name, tld } = data?.domain ? splitDomain(data.domain) : { name: '', tld: '' };
  const availability = data?.availability || {};
  const isAvailable = availability.status === 'available';
  const isPremium = Boolean(availability.is_premium);
  const priceInr = availability.price_inr;
  const renewalInr = availability.renewal_price_inr;
  const minPeriodYears = Math.max(1, Number(availability.min_period_years || 1));
  const cartProps =
    isAvailable && priceInr != null && data?.domain
      ? domainRegistrationCartProps({
          domain: data.domain,
          tld,
          registrationPriceInr: priceInr,
          period: 1,
          minPeriodYears,
          isPremium,
        })
      : null;
  const tldSuggestions = SUGGESTED_TLDS.filter((s) => s !== tld).map((s) => ({
    tld: s,
    url: `/storefront?domain=${encodeURIComponent(`${name}.${s}`)}`,
  }));

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col bg-white overflow-visible">
      {/* Scoped loading/entrance animations — no global CSS changes */}
      <style>{CB_SHARED_STYLES}</style>
      <TopNavbar homeMobileMenu hideContactUs isScrolled={isScrolled} />
      <HomeNavbar
        navRef={navRef}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        navigate={navigate}
        isScrolled={isScrolled}
      />

      {/* Hero — desktop 2 columns (card | explore), stacked on mobile.
          flex-1 makes it grow so the footer sticks to the bottom on short
          pages (sticky-footer in normal document flow, never fixed). */}
      <section className="home-hero-align-outer relative flex-1 overflow-visible">
        <div className="home-hero-align-inner">
          <div className="relative">
            {/* Ambient glow — same design language as the homepage hero */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-x-hidden bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(56,189,248,0.14),transparent_70%)]"
            />
            <div className="relative z-10 py-10 sm:py-14 lg:py-16">
              {loading ? (
                <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
                  <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_16px_48px_rgba(15,23,42,0.06)] sm:p-10">
                    <div className="flex items-center gap-2">
                      <span className="cb-shared-live-dot" aria-hidden="true" />
                      <span className="text-sm font-semibold text-gray-600">
                        Deltapreneur is checking the shared domain live…
                      </span>
                    </div>
                    <div className="cb-shared-skel mt-5 h-3 w-28 rounded-full" />
                    <div className="cb-shared-skel mt-4 h-4 w-44 rounded-full" />
                    <div className="cb-shared-skel mt-6 h-10 w-64 rounded-xl" />
                    <div className="mt-6 flex items-center gap-3">
                      <div className="cb-shared-skel h-12 w-40 rounded-xl" />
                      <div className="cb-shared-skel h-12 w-28 rounded-xl" />
                    </div>
                  </div>
                </div>
              ) : error || !data?.domain ? (
                <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
                  <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-[0_16px_48px_rgba(15,23,42,0.06)] sm:p-10">
                    <p className="text-lg font-bold text-gray-800">
                      {error || 'Share link not found.'}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      The link may have expired or the domain may no longer be shared.
                    </p>
                    <Link
                      to="/"
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-700 hover:text-white"
                    >
                      Back to Deltapreneur <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:items-start lg:gap-8">
                    {/* ── LEFT: shared domain card (entrance) ─────────────── */}
                    <div
                      className={`cb-reveal rounded-3xl border p-6 shadow-[0_16px_48px_rgba(15,23,42,0.07)] sm:p-8 ${
                        isPremium
                          ? 'border-amber-300/80 bg-gradient-to-br from-amber-50/80 via-white to-white ring-1 ring-amber-200/60'
                          : 'border-sky-300/80 bg-gradient-to-br from-sky-50/80 via-white to-white ring-1 ring-sky-200/60'
                      }`}
                    >
                      {/* Label */}
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                        Shared domain
                      </p>

                      {data.original_query ? (
                        <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white/80 py-1.5 pl-3 pr-4">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            Search context
                          </span>
                          <span className="truncate text-sm font-bold text-gray-800">
                            “{data.original_query}”
                          </span>
                        </div>
                      ) : null}

                      {/* Badges */}
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <StatusPill availability={availability} />
                        {isPremium ? (
                          <RegistryPremiumBadge />
                        ) : isAvailable ? (
                          <RegistryStandardBadge />
                        ) : null}
                      </div>

                      {/* Domain */}
                      <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-gray-950 sm:text-6xl">
                        {name}
                        <span className={isPremium ? 'text-amber-700' : 'text-sky-700'}>
                          .{tld}
                        </span>
                      </h1>
                      {isPremium ? (
                        <p className="mt-2 text-sm font-semibold text-amber-800/85">
                          Premium Domain — premium registry pricing
                        </p>
                      ) : isAvailable ? (
                        <p className="mt-2 text-sm font-semibold text-sky-800/85">
                          Standard Domain — available to register now
                        </p>
                      ) : null}

                      {/* Price */}
                      <div className="mt-6 border-t border-gray-100 pt-6">
                        {isAvailable && priceInr != null ? (
                          <>
                            <p className="text-4xl font-extrabold text-gray-950 leading-none">
                              {formatDomainPrice(priceInr)}
                              <span className="ml-1.5 text-base font-medium text-gray-400">
                                {isPremium ? ' (1st Year)' : '/yr'}
                              </span>
                            </p>
                            {renewalInr != null ? (
                              <p className="mt-2 text-sm text-gray-500">
                                Renews at {formatDomainPrice(renewalInr)}/yr
                              </p>
                            ) : isPremium ? (
                              <p className="mt-2 text-sm text-gray-400">
                                Renewal price unavailable
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-lg font-semibold text-gray-600">
                            {availability.status === 'check_failed'
                              ? 'Live availability is being verified right now.'
                              : 'This domain is no longer available.'}
                          </p>
                        )}
                        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                          <RefreshCw className="h-3 w-3 shrink-0" />
                          {data.notice || 'Price and availability are subject to change.'}
                        </p>
                      </div>

                      {/* Actions: Add to Cart, Like, Share */}
                      <div className="mt-7 flex flex-wrap items-center gap-3">
                        {cartProps ? (
                          <AddToCartButton
                            {...cartProps}
                            tone="dark"
                            size="md"
                            wrapperClassName="w-fit max-w-full"
                            className="!flex-none !min-w-0 !w-auto !justify-center !rounded-xl !px-5 !py-3 !text-sm !font-bold !whitespace-nowrap"
                          />
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex w-fit items-center rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-400 cursor-not-allowed"
                          >
                            {availability.status === 'check_failed'
                              ? 'Checking availability…'
                              : 'Not available'}
                          </button>
                        )}
                        {data.domain ? (
                          <LikeButton
                            liked={liked}
                            count={likeCount}
                            onToggle={handleLike}
                            size="md"
                            className="h-[2.875rem] rounded-xl border border-gray-200 bg-white px-4"
                          />
                        ) : null}
                        {data.domain ? (
                          <ShareButton
                            shareType={data.share_type || 'DOMAIN_SEARCH'}
                            domain={data.domain}
                            originalQuery={data.original_query}
                            availability={availability}
                          />
                        ) : null}
                      </div>
                    </div>

                    {/* ── RIGHT: explore more (staggered entrance) ─────────── */}
                    <div className="cb-reveal cb-reveal--delay-1 rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/60 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)] sm:p-8">
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <h2 className="text-2xl font-extrabold tracking-tight text-gray-950">
                          Explore more domains
                          <span className="block text-sm font-semibold text-gray-500">
                            on Deltapreneur
                          </span>
                        </h2>
                        <Link
                          to="/storefront"
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                        >
                          <Search className="h-4 w-4" /> New search
                        </Link>
                      </div>

                      <p className="mt-3 text-sm text-gray-500">
                        {tld
                          ? `See other extensions for “${name}” or start a fresh search.`
                          : 'Find your perfect domain name.'}
                      </p>

                      {tldSuggestions.length > 0 ? (
                        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {tldSuggestions.map((s) => (
                            <Link
                              key={s.tld}
                              to={s.url}
                              className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_8px_20px_rgba(2,132,199,0.08)]"
                            >
                              <span className="text-sm font-bold text-gray-800">
                                {name}
                                <span className="text-sky-700">.{s.tld}</span>
                              </span>
                              <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-sky-600" />
                            </Link>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                        <Link
                          to="/storefront"
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-700 hover:text-white"
                        >
                          Search more domains <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/domains"
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          Browse the domain marketplace
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
