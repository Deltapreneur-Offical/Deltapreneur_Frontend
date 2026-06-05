import DomainSearchBar from './DomainSearchBar';

export default function HeroGlow() {
  return (
    <section className="hero-glow-section relative overflow-x-hidden overflow-y-visible border-b-0 bg-transparent pb-0 pl-4 pr-4 pt-5 sm:pl-6 sm:pr-5 sm:pt-6 md:pl-10 md:pt-7 lg:pl-20 lg:pr-8 lg:pt-7">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-x-hidden glow-layer" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-[920px] flex-col items-start text-left">
          <div className="relative z-20 flex w-full min-w-0 flex-col items-start">
            <p className="hero-tagline m-0 font-sans">Don't Just Start. Disrupt.</p>
            <h1 className="hero-headline m-0 font-sans font-normal leading-[1.2] text-black">
              Why just be a consumer? Be the <span className="hero-emphasis">Creator</span> with{' '}
              <span className="hero-emphasis">CoBrother!</span>
            </h1>
          </div>

          <DomainSearchBar embedded className="mt-7 sm:mt-8 lg:mt-8" />
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
            hsl(var(--glow-hue), 70%, 66%, 0.42) 0%,
            hsl(var(--glow-hue), 62%, 64%, 0.22) 40%,
            hsl(var(--glow-hue), 58%, 62%, 0.1) 65%,
            transparent 82%
          );
        }

        @media (prefers-reduced-motion: reduce) {
          .glow-layer {
            animation: none;
          }
        }

        .hero-tagline {
          margin-bottom: 0.35rem;
          font-family: 'Inter', 'Plus Jakarta Sans', 'Manrope', var(--font-body), system-ui, sans-serif;
          font-size: clamp(0.72rem, 1.25vw, 0.9rem);
          font-weight: 400;
          letter-spacing: 0.08em;
          color: rgba(51, 65, 85, 0.72);
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .hero-headline {
          display: inline-block;
          font-family: 'Inter', 'Plus Jakarta Sans', 'Manrope', var(--font-body), system-ui, sans-serif;
          font-size: clamp(1.02rem, 3.2vw, 1.22rem);
          font-weight: 400;
          letter-spacing: 0;
          color: #050505;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .hero-emphasis {
          color: inherit;
          font-weight: 800;
        }

        @media (min-width: 640px) {
          .hero-headline {
            font-size: clamp(1.12rem, 1.85vw, 1.3rem);
          }
        }

        @media (min-width: 1024px) {
          .hero-headline {
            font-size: clamp(1.18rem, 1.08vw, 1.32rem);
            white-space: nowrap;
          }
        }

        @media (min-width: 1280px) {
          .hero-headline {
            font-size: 1.34rem;
          }
        }
      `}</style>
    </section>
  );
}
