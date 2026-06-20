import { motion, useReducedMotion } from 'framer-motion';
import {
  homeStaggerContainer,
  homeStaggerItem,
  homeViewport,
} from './motion/homeMotion';

export default function HomePreviewRow({ children, className = '', animate = true }) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;

  if (!shouldAnimate) {
    return (
      <div className={`home-preview-row${className ? ` ${className}` : ''}`}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={`home-preview-row${className ? ` ${className}` : ''}`}
      initial="hidden"
      whileInView="visible"
      viewport={homeViewport}
      variants={homeStaggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function HomePreviewRowItem({ children }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className="home-preview-row__item">
        <div className="home-preview-row__card">{children}</div>
      </div>
    );
  }

  return (
    <motion.div className="home-preview-row__item" variants={homeStaggerItem}>
      <div className="home-preview-row__card">{children}</div>
    </motion.div>
  );
}
