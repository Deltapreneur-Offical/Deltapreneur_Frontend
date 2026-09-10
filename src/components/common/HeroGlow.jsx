import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import DomainSearchBar from './DomainSearchBar';
import {
  heroEnterContainer,
  heroHeadlineEnter,
} from '../home/motion/homeMotion';

export default function HeroGlow() {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const headline = t('homeHeroHeadline', { defaultValue: 'The Delta Edition Of Entrepreneur!' });

  const textStack = reduceMotion ? (
    <div className="hero-text-stack relative z-20 w-full min-w-0">
      <h1 className="hero-headline m-0 font-sans font-semibold text-black">
        {headline}
      </h1>
    </div>
  ) : (
    <motion.div
      className="hero-text-stack relative z-20 w-full min-w-0"
      variants={heroEnterContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        className="hero-headline m-0 font-sans font-semibold text-black"
        variants={heroHeadlineEnter}
      >
        {headline}
      </motion.h1>
    </motion.div>
  );

  return (
    <section className="hero-glow-section relative overflow-y-visible border-b-0 bg-transparent px-4 pb-2 pt-5 sm:px-6 sm:pt-6 md:px-8 md:pt-7 lg:px-8 lg:pt-7">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-x-hidden glow-layer" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-[920px] flex-col items-start text-left">
          {textStack}
        </div>
      </div>

      <style>{`
        .hero-text-stack {
          display: block;
          width: 100%;
          max-width: calc(100vw - 4rem);
          min-width: 0;
        }

        .hero-headline {
          display: block;
          width: min(100%, calc(100vw - 4rem));
          max-width: 100%;
          margin: 0;
          line-height: 1.25;
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: clamp(1.02rem, 3.2vw, 1.22rem);
          font-weight: 500;
          letter-spacing: 0;
          color: #050505;
          white-space: normal;
          overflow-wrap: break-word;
          word-break: normal;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        @media (max-width: 639px) {
          .hero-text-stack,
          .hero-headline {
            width: min(100%, 20.5rem) !important;
            max-width: 20.5rem !important;
          }

          .hero-headline {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
        }

        @media (min-width: 640px) and (max-width: 1023px) {
          .hero-text-stack,
          .hero-headline {
            width: min(100%, 42rem) !important;
            max-width: 42rem !important;
          }
        }

        @media (min-width: 640px) {
          .hero-text-stack {
            max-width: 100%;
          }

          .hero-headline {
            width: 100%;
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
