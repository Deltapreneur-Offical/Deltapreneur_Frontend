/** Homepage motion tokens — aligned with existing CoBrother easing (domain ticker, card CSS). */

export const HOME_EASE = [0.22, 1, 0.36, 1];
export const HOME_EASE_OUT = [0.16, 0.84, 0.24, 1];

export const homeViewport = {
  once: true,
  margin: '0px 0px -56px 0px',
  amount: 0.12,
};

export const homeStaggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.05,
    },
  },
};

export const homeStaggerItem = {
  hidden: {
    opacity: 0,
    y: 18,
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

export const homeRowReveal = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.48,
      ease: HOME_EASE,
    },
  },
};

export const homeHeaderReveal = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.46,
      ease: HOME_EASE,
    },
  },
};

export const homeCardHover = {
  y: -5,
  transition: {
    duration: 0.08,
    ease: HOME_EASE_OUT,
  },
};

export const homeCardTap = {
  y: -2,
  scale: 0.996,
  transition: {
    duration: 0.14,
    ease: HOME_EASE_OUT,
  },
};

export const homeFeatureIconHover = {
  scale: 1.06,
  transition: {
    duration: 0.32,
    ease: HOME_EASE_OUT,
  },
};

/** Hero search stack — mount sequence (above the fold). */
export const heroEnterContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
};

export const heroDotEnter = {
  hidden: {
    opacity: 0,
    scale: 0.4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.42,
      ease: HOME_EASE,
    },
  },
};

export const heroTaglineEnter = {
  hidden: {
    opacity: 0,
    y: 10,
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

export const heroHeadlineEnter = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.56,
      ease: HOME_EASE,
    },
  },
};

/** Search + tabs move as one unit — avoids transform overlap between siblings. */
export const heroSearchStackEnter = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.54,
      ease: HOME_EASE,
      delay: 0.18,
    },
  },
};

export const heroSubmitHover = {
  y: 0,
  scale: 1.045,
  transition: {
    duration: 0.22,
    ease: HOME_EASE_OUT,
  },
};

export const heroSubmitTap = {
  y: 0,
  scale: 0.96,
  transition: {
    duration: 0.12,
    ease: HOME_EASE_OUT,
  },
};

export const heroTabSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.82,
};

export const heroTabIdleHover = {
  scale: 1.02,
  transition: {
    duration: 0.2,
    ease: HOME_EASE_OUT,
  },
};
