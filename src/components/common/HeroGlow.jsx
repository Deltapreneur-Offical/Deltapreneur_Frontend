import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Clock, Shield } from 'lucide-react';

export default function HeroGlow() {
  const { t } = useTranslation();

  return (
    <section className="hero-glow-section relative overflow-x-hidden overflow-y-visible border-b-0 bg-transparent py-6 pl-4 pr-4 sm:py-8 sm:pl-6 sm:pr-5 md:py-10 md:pl-10 lg:pl-20 lg:pr-8">

      <div className="pointer-events-none absolute inset-0 z-0 overflow-x-hidden glow-layer" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* Left: headline, copy, CTA, trust — above carousel so text is never covered */}
          <div className="relative z-20 w-full min-w-0 lg:max-w-[700px]">
            <p className="mb-5 flex items-center gap-2 text-[13px] font-medium text-slate-600 sm:mb-6">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
              {t('heroEyebrow')}
            </p>

            <div className="flex flex-col gap-4 sm:gap-5">
              <div>
                <h1 className="hero-headline m-0 font-sans font-bold leading-[1.08] tracking-[-0.02em] text-[#1e293b]">
                  <span className="hero-headline-line1 block text-[#1e293b]">
                    {t('heroHeadingBefore')}
                  </span>
                  <span className="hero-headline-line2 mt-1 block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text pb-[0.4rem] text-transparent">
                    {t('heroHeadingAccent')}
                  </span>
                </h1>

                <p className="hero-subtitle m-0 mt-3 max-w-[34rem] text-[15px] leading-[1.6] text-slate-500 sm:text-base">
                  <span className="block">{t('heroSubtitleLine1')}</span>
                  <span className="block">{t('heroSubtitleLine2')}</span>
                </p>
              </div>

              <div>
                <Link
                  to="/auctions"
                  className="hero-explore-cta group inline-flex items-center gap-2 rounded-xl bg-[#232f3e] px-6 py-3 text-[14px] font-semibold text-white shadow-sm transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-600 hover:via-indigo-600 hover:to-violet-600 hover:text-white hover:shadow-[0_8px_28px_rgba(79,70,229,0.45)] sm:px-7 sm:py-3.5"
                >
                  {t('heroExploreAuctions')}
                  <ArrowRight
                    className="hero-explore-arrow h-4 w-4 shrink-0 text-white transition-colors duration-300 group-hover:text-white"
                    strokeWidth={2.25}
                  />
                </Link>
              </div>

              <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[13px] font-medium text-emerald-700">
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.75} />
                  {t('heroTrustSecure')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.75} />
                  {t('heroTrustVerified')}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.75} />
                  {t('heroTrustSupport')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @property --glow-hue {
          syntax: '<number>';
          initial-value: 200;
          inherits: false;
        }

        @keyframes hueRotate {
          0% { --glow-hue: 200; }
          25% { --glow-hue: 220; }
          50% { --glow-hue: 190; }
          75% { --glow-hue: 170; }
          100% { --glow-hue: 200; }
        }

        .glow-layer {
          animation: hueRotate 12s ease-in-out infinite;
          background: radial-gradient(
            ellipse 90% 80% at 22% 0%,
            hsl(var(--glow-hue), 80%, 62%, 0.62) 0%,
            hsl(var(--glow-hue), 75%, 60%, 0.32) 40%,
            hsl(var(--glow-hue), 70%, 58%, 0.14) 65%,
            transparent 82%
          );
        }

        @media (prefers-reduced-motion: reduce) {
          .glow-layer {
            animation: none;
          }
        }

        @keyframes hero-arrow-nudge {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(6px);
          }
        }

        .hero-explore-arrow {
          animation: hero-arrow-nudge 1.15s ease-in-out infinite;
        }

        .hero-explore-cta:hover,
        .hero-explore-cta:focus-visible {
          color: #ffffff;
        }

        .hero-explore-cta:hover .hero-explore-arrow,
        .hero-explore-cta:focus-visible .hero-explore-arrow {
          color: #ffffff;
          animation-duration: 0.85s;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-explore-arrow {
            animation: none;
          }
        }

        .hero-headline {
          font-size: clamp(1.5rem, 4.2vw, 2.65rem);
        }

        @media (min-width: 640px) {
          .hero-headline {
            font-size: clamp(1.7rem, 3.8vw, 2.5rem);
          }
        }

        @media (min-width: 1024px) {
          .hero-headline {
            font-size: clamp(1.85rem, 2.6vw, 2.4rem);
          }

          .hero-headline-line1 {
            white-space: nowrap;
          }

          .hero-headline-line2 {
            white-space: normal;
          }

          .hero-subtitle {
            margin-top: 0.75rem;
          }
        }

        @media (min-width: 1280px) {
          .hero-headline {
            font-size: 2.45rem;
          }
        }
      `}</style>
    </section>
  );
}
