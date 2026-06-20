import { motion, useReducedMotion } from 'framer-motion';
import {
  pageCardHover,
  pageHeroContainer,
  pageHeroItem,
  pageRevealFade,
  pageRevealLeft,
  pageRevealRight,
  pageRevealUp,
  pageStaggerContainer,
  pageStaggerItem,
  pageViewport,
  HOME_EASE,
} from './motionPresets';

const revealVariants = {
  up: pageRevealUp,
  left: pageRevealLeft,
  right: pageRevealRight,
  fade: pageRevealFade,
};

export function PageHero({ children, className = '' }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={pageHeroContainer}
    >
      {children}
    </motion.div>
  );
}

export function PageHeroItem({ children, className = '' }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={pageHeroItem}>
      {children}
    </motion.div>
  );
}

export function PageReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}) {
  const reduceMotion = useReducedMotion();
  const variants = revealVariants[direction] || pageRevealUp;

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={pageViewport}
      variants={variants}
      transition={{ delay, duration: 0.52, ease: HOME_EASE }}
    >
      {children}
    </motion.div>
  );
}

export function PageStagger({ children, className = '', mount = false }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const motionProps = mount
    ? { initial: 'hidden', animate: 'visible' }
    : { initial: 'hidden', whileInView: 'visible', viewport: pageViewport };

  return (
    <motion.div className={className} variants={pageStaggerContainer} {...motionProps}>
      {children}
    </motion.div>
  );
}

export function PageStaggerItem({ children, className = '', hover = false }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const hoverProps = hover
    ? { whileHover: pageCardHover, whileTap: { y: -1, scale: 0.998 } }
    : {};

  return (
    <motion.div className={className} variants={pageStaggerItem} {...hoverProps}>
      {children}
    </motion.div>
  );
}
