import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { homeHeaderReveal, homeViewport } from './motion/homeMotion';

export default function HomeSectionHeader({ title, to }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const HeaderTag = reduceMotion ? 'header' : motion.header;
  const headerProps = reduceMotion
    ? {}
    : {
        initial: 'hidden',
        whileInView: 'visible',
        viewport: homeViewport,
        variants: homeHeaderReveal,
      };

  return (
    <HeaderTag className="home-section-header" {...headerProps}>
      <div className="home-section-header__top">
        <h2 className="home-section-header__title">{title}</h2>
        {to ? (
          <Link to={to} className="home-section-header__view-all">
            <span>{t('viewAll')}</span>
            <ArrowRight className="home-section-header__view-all-icon" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </HeaderTag>
  );
}
