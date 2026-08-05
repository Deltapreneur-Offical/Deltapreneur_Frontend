import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { homeHeaderReveal, homeViewport } from './motion/homeMotion';

/**
 * Homepage section title + optional View All.
 * @param {string} [accent] - theme key matching card borders (domain, venture, …)
 * @param {boolean} [showViewAll=true] - hide View All for empty sections
 */
export default function HomeSectionHeader({ title, to, accent, showViewAll = true }) {
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

  const showLink = Boolean(to) && showViewAll !== false;
  const accentClass = accent ? ` home-section-header--${accent}` : '';

  return (
    <HeaderTag
      className={`home-section-header${accentClass}`.trim()}
      {...headerProps}
    >
      <div className="home-section-header__top">
        <h2 className="home-section-header__title">{title}</h2>
        {showLink ? (
          <Link to={to} className="home-section-header__view-all">
            <span>{t('viewAll')}</span>
            <ArrowRight className="home-section-header__view-all-icon" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </HeaderTag>
  );
}
