import {
  HOME_EASE,
  HOME_EASE_OUT,
  homeCardHover,
  homeCardTap,
} from '../home/motion/homeMotion';

export { HOME_EASE, HOME_EASE_OUT, homeCardHover, homeCardTap };

export const pageViewport = {
  once: true,
  margin: '0px 0px -64px 0px',
  amount: 0.14,
};

export const pageHeroContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.085,
      delayChildren: 0.06,
    },
  },
};

export const pageHeroItem = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: HOME_EASE,
    },
  },
};

export const pageRevealUp = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.52,
      ease: HOME_EASE,
    },
  },
};

export const pageRevealLeft = {
  hidden: {
    opacity: 0,
    x: -18,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.52,
      ease: HOME_EASE,
    },
  },
};

export const pageRevealRight = {
  hidden: {
    opacity: 0,
    x: 18,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.52,
      ease: HOME_EASE,
    },
  },
};

export const pageRevealFade = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.45,
      ease: HOME_EASE,
    },
  },
};

export const pageStaggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

export const pageStaggerItem = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.48,
      ease: HOME_EASE,
    },
  },
};

export const pageCardHover = {
  y: -4,
  transition: {
    duration: 0.26,
    ease: HOME_EASE_OUT,
  },
};

export const pageLinkHover = {
  x: 3,
  transition: {
    duration: 0.2,
    ease: HOME_EASE_OUT,
  },
};
