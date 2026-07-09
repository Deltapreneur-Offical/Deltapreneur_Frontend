import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import DomainSearchBar from './DomainSearchBar';
import {
  heroDotEnter,
  heroEnterContainer,
  heroHeadlineEnter,
  heroTaglineEnter,
} from '../home/motion/homeMotion';

export default function HeroGlow() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const textStack = reduceMotion ? (
    <div className="hero-text-stack relative z-20 w-full min-w-0">
      <span className="hero-tagline-dot" aria-hidden="true" />
      <p className="hero-tagline m-0 font-sans">{t('heroEyebrow')}</p>
      <h1 className="hero-headline m-0 font-sans font-normal text-black">
        Start It Up With{' '}
        <span className="hero-emphasis">CoBrother</span>
        {' '}To{' '}
        <span className="hero-emphasis">Disrupt</span>
      </h1>
    </div>
  ) : (
    <motion.div
      className="hero-text-stack relative z-20 w-full min-w-0"
      variants={heroEnterContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.span
        className="hero-tagline-dot"
        aria-hidden="true"
        variants={heroDotEnter}
      />
      <motion.p className="hero-tagline m-0 font-sans" variants={heroTaglineEnter}>
        {t('heroEyebrow')}
      </motion.p>
      <motion.h1
        className="hero-headline m-0 font-sans font-normal text-black"
        variants={heroHeadlineEnter}
      >
        Start It Up With{' '}
        <span className="hero-emphasis">CoBrother</span>
        {' '}To{' '}
        <span className="hero-emphasis">Disrupt</span>
      </motion.h1>
    </motion.div>
  );

  return (
    <section className="hero-glow-section relative overflow-y-visible border-b-0 bg-transparent pb-2 pl-4 pr-4 pt-5 sm:pl-6 sm:pr-5 sm:pt-6 md:pl-10 md:pt-7 lg:pl-20 lg:pr-8 lg:pt-7">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-x-hidden glow-layer" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-[920px] flex-col items-start text-left">
          {textStack}
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

        .hero-text-stack {
          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: 0.5rem;
          row-gap: 0.15rem;
          align-items: start;
        }

        .hero-tagline-dot {
          grid-column: 1;
          grid-row: 1;
          align-self: center;
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: var(--cobrother-brand-green);
          flex-shrink: 0;
        }

        .hero-tagline {
          grid-column: 2;
          grid-row: 1;
          margin: 0;
          line-height: 1.2;
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: clamp(0.72rem, 1.25vw, 0.9rem);
          font-weight: 400;
          letter-spacing: 0.08em;
          color: rgba(51, 65, 85, 0.72);
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .hero-headline {
          grid-column: 2;
          grid-row: 2;
          display: block;
          width: 100%;
          margin: 0;
          line-height: 1.25;
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: clamp(1.02rem, 3.2vw, 1.22rem);
          font-weight: 400;
          letter-spacing: 0;
          color: #050505;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .hero-emphasis {
          color: inherit;
          font-weight: 600;
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
