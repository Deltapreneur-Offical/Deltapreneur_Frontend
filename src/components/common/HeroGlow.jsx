import { useTranslation } from 'react-i18next';
import DomainSearchBar from './DomainSearchBar';

export default function HeroGlow() {
  const { t } = useTranslation();

  return (
    <section className="hero-glow-section relative overflow-x-hidden overflow-y-visible border-b-0 bg-transparent py-4 pl-4 pr-4 sm:py-5 sm:pl-6 sm:pr-5 md:py-6 md:pl-10 lg:py-7 lg:pl-20 lg:pr-8">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-x-hidden glow-layer" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col">
          <div className="relative z-20 w-full min-w-0 lg:max-w-[700px]">
            <h1 className="hero-headline m-0 font-sans font-bold leading-[1.08] tracking-[-0.02em] text-[#1e293b]">
              <span className="hero-headline-line1 block text-[#1e293b]">
                {t('heroHeadingBefore')}
              </span>
              <span className="hero-headline-line2 mt-1 block pb-[0.4rem] text-[#1e293b]">
                {t('heroHeadingAccent')}
              </span>
            </h1>
          </div>

          <DomainSearchBar embedded className="mt-4 sm:mt-5 lg:mt-6" />
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
