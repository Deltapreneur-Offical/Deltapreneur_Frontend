import { motion, useReducedMotion } from 'framer-motion';
import ListingCardShell from '../listings/ListingCardShell';
import { homeCardHover, homeCardTap } from './motion/homeMotion';

/**
 * Homepage listing preview wrapper — slight hero-glow border (no shadow).
 * @param {'domain'|'venture'|'coventure'|'technology'|'community'|'auction'|'operations'|'assistance'|'essentials'} accent
 * @param {boolean} [borderless] — hide the outer border (default + hover); keep lift hover
 */
export default function HomePreviewCardShell({
  children,
  className = '',
  accent = 'domain',
  borderless = false,
}) {
  const reduceMotion = useReducedMotion();
  const accentClass = accent ? ` home-preview-card-border--${accent}` : '';
  const borderlessClass = borderless ? ' home-preview-card-border--borderless' : '';
  const BorderTag = reduceMotion ? 'div' : motion.div;
  const borderMotionProps = reduceMotion
    ? {}
    : {
      whileHover: homeCardHover,
      whileTap: homeCardTap,
    };

  return (
    <ListingCardShell className={`home-preview-card-shell${className ? ` ${className}` : ''}`}>
      <BorderTag
        className={`home-preview-card-border w-full${accentClass}${borderlessClass}`}
        {...borderMotionProps}
      >
        <div className="home-feature-card-beam-spinner" aria-hidden="true" />

        <div className="home-preview-card-border__inner w-full">
          {children}
        </div>
      </BorderTag>
    </ListingCardShell>
  );
}
