import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Share2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import bulletpointTick from '../../assets/bulletpointtick.png';
import cardTickLightBlue from '../../assets/cardticklightblue.png';
import {
  Briefcase, Building2, Car, Clapperboard, Copyright, Cpu,
  Factory, FlaskConical, Globe, GraduationCap, HardHat, HeartPulse,
  Hotel, Landmark, Leaf, Monitor, Plane, Radio, Receipt, Rocket,
  Shield, ShoppingBag, Truck, Users, UtensilsCrossed, Wheat, Zap,
} from 'lucide-react';
import { registrationsPathForCategory, REGISTRATIONS_PAGE_PATH } from '../../utils/operationsSections';
import { usePublicHubRegistrarCategories } from '../../context/CategoryContext';
import useCurrency from '../../context/CurrencyContext';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import '../../styles/registrations-catalog.css';

const CATEGORY_ICONS = {
  business_entity: Building2, tax_identity: Receipt, local_licences: Landmark,
  msme_udyam: Factory, startup_dpiit: Rocket, food_fssai: UtensilsCrossed,
  import_export: Globe, manufacturing: Factory, technology_saas: Cpu,
  ecommerce: ShoppingBag, fintech: Landmark, aviation: Plane,
  construction_real_estate: HardHat, healthcare: HeartPulse,
  education: GraduationCap, professional_services: Briefcase, telecom: Radio,
  pharma_chemical: FlaskConical, automotive: Car, agriculture: Wheat,
  logistics_transport: Truck, tourism_hospitality: Hotel,
  entertainment_media: Clapperboard, energy_power: Zap,
  defence_aerospace: Shield, intellectual_property: Copyright,
  employer_labour: Users, environmental: Leaf, digital_services: Monitor,
};



export default function HomeRegistrationsSection() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { categories: allCategories, fetched } = usePublicHubRegistrarCategories();
  const rowWrapRef = useRef(null);
  const suppressCardClickRef = useRef(false);
  const navigate = useNavigate();
  const waitingForCategories = !fetched && allCategories.length === 0;

  const filteredCategories = useMemo(() => {
    const query = categoryFilter.trim().toLowerCase();
    if (!query) return allCategories;
    return allCategories.filter((cat) => (
      cat.label.toLowerCase().includes(query)
      || cat.slug.toLowerCase().includes(query)
      || (cat.description || '').toLowerCase().includes(query)
      || (cat.highlights || []).some((p) => p.toLowerCase().includes(query))
    ));
  }, [categoryFilter, allCategories]);

  const getPreviewRow = useCallback(() => (
    rowWrapRef.current?.querySelector('.home-preview-row') || null
  ), []);

  const getPageStep = useCallback((el) => {
    const item = el.querySelector('.home-preview-row__item');
    if (!item) return Math.round(el.clientWidth * 0.75);
    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.columnGap || styles.gap) || 24;
    const pad = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const cardWidth = item.getBoundingClientRect().width;
    const stride = cardWidth + gap;
    if (stride <= 0) return Math.round(el.clientWidth * 0.75);
    const usable = Math.max(0, el.clientWidth - pad);
    const visibleCount = Math.max(1, Math.floor((usable + gap) / stride));
    return visibleCount * stride;
  }, []);

  const updateNavState = useCallback(() => {
    const el = getPreviewRow();
    const wrap = rowWrapRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(max > 2 && el.scrollLeft < max - 2);

    if (wrap) {
      const wrapRect = wrap.getBoundingClientRect();
      const card = wrap.querySelector('.reg-mini-card');
      if (card) {
        const cardRect = card.getBoundingClientRect();
        const center = cardRect.top - wrapRect.top + cardRect.height / 2;
        wrap.style.setProperty('--reg-nav-center', `${Math.round(center)}px`);
      }
      const edgeGap = 28;
      wrap.style.setProperty('--reg-nav-inset-left', `${Math.round(edgeGap - wrapRect.left)}px`);
      wrap.style.setProperty('--reg-nav-inset-right', `${Math.round(wrapRect.right - window.innerWidth + edgeGap)}px`);
    }
  }, [getPreviewRow]);

  const scrollCards = useCallback((dir) => {
    const el = getPreviewRow();
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = Math.min(maxScroll, Math.max(0, el.scrollLeft + dir * getPageStep(el)));
    el.scrollTo({ left: next, behavior: 'smooth' });
  }, [getPreviewRow, getPageStep]);

  useEffect(() => {
    const el = getPreviewRow();
    if (!el) return undefined;

    updateNavState();
    const rafId = requestAnimationFrame(updateNavState);

    const onScroll = () => updateNavState();
    el.addEventListener('scroll', onScroll, { passive: true });
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateNavState)
      : null;
    resizeObserver?.observe(el);
    const firstCard = el.querySelector('.reg-mini-card');
    if (firstCard) resizeObserver?.observe(firstCard);
    window.addEventListener('resize', updateNavState);

    // Click-drag scrolls the row. A plain click must still open the card.
    // Do not mark the row as dragging (or capture the pointer) until the
    // pointer actually moves — otherwise the card Link never receives click.
    let pointerId = null;
    let startX = 0;
    let startScroll = 0;
    let dragged = false;
    let capturing = false;

    const onPointerDown = (e) => {
      if (e.pointerType === 'touch') return;
      if (e.target.closest('.reg-mini-card__share, .reg-cards-nav')) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      dragged = false;
      capturing = false;
      suppressCardClickRef.current = false;
    };

    const onPointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      if (pointerId === null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) < 8) return;
      dragged = true;
      suppressCardClickRef.current = true;
      if (!capturing) {
        capturing = true;
        el.classList.add('reg-cards-preview-row--dragging');
        try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
      el.scrollLeft = startScroll - dx;
    };

    const onPointerUp = (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      pointerId = null;
      el.classList.remove('reg-cards-preview-row--dragging');
      if (capturing) {
        try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      }
      capturing = false;
      if (!dragged) return;
      const blockClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        el.removeEventListener('click', blockClick, true);
      };
      el.addEventListener('click', blockClick, true);
      window.setTimeout(() => {
        el.removeEventListener('click', blockClick, true);
        suppressCardClickRef.current = false;
      }, 0);
    };

    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaX;
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', onScroll);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateNavState);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.classList.remove('reg-cards-preview-row--dragging');
    };
  }, [filteredCategories, getPreviewRow, updateNavState]);

  const handleShare = useCallback((e, cat) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.origin + registrationsPathForCategory(cat.slug);
    const title = cat.label || 'Deltapreneur';
    const text = `Check out ${title} registrations on Deltapreneur!\n\n${url}`;

    // Use native share if available (mobile)
    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
      return;
    }

    // Fallback: copy to clipboard with visual feedback
    const copyText = (text) => {
      if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve();
    };

    copyText(url)
      .then(() => {
        setCopiedSlug(cat.slug);
        setTimeout(() => setCopiedSlug(null), 1500);
      })
      .catch(() => {
        window.prompt('Copy this link:', url);
      });
  }, []);

  const handleCardClick = useCallback((e, cat) => {
    if (suppressCardClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const path = registrationsPathForCategory(cat.slug);
    e.preventDefault();
    navigate(path);
  }, [navigate]);

  const renderCard = (cat) => {
    const Icon = CATEGORY_ICONS[cat.slug] || Briefcase;
    const highlights = (cat.highlights || []).slice(0, 3);
    const displayName = t('regCatName' + cat.slug.charAt(0).toUpperCase() + cat.slug.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase()), { defaultValue: cat.label });
    const displayDesc = t('regCatDesc' + cat.slug.charAt(0).toUpperCase() + cat.slug.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase()), { defaultValue: cat.description || '' });
    const priceNumeric = cat.priceNumeric || 0;

    return (
      <div className="reg-mini-card-wrapper">
        <button type="button" className="reg-mini-card__share" onClick={(e) => handleShare(e, cat)} aria-label="Share">
          {copiedSlug === cat.slug ? <Check size={15} strokeWidth={2.5} /> : <Share2 size={15} strokeWidth={2} />}
        </button>
        <Link
          to={registrationsPathForCategory(cat.slug)}
          className="reg-mini-card"
          aria-label={`${cat.label} registrations`}
          onClick={(e) => handleCardClick(e, cat)}
        >
        <img
          src={cardTickLightBlue}
          alt=""
          aria-hidden
          draggable="false"
          className="reg-mini-card__watermark"
        />
        <div className="reg-mini-card__top">
          <h3 className="reg-mini-card__title">{displayName}</h3>
          {displayDesc && (
            <p className="reg-mini-card__desc">{displayDesc}</p>
          )}
        </div>
        {highlights.length > 0 && (
          <ul className="reg-mini-card__list">
            {highlights.map((point, idx) => {
              const slugPascal = cat.slug.charAt(0).toUpperCase() + cat.slug.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
              const translated = t(`regCatHighlight${slugPascal}${idx}`, { defaultValue: point });
              return (
                <li key={point}>
                  <img
                    src={bulletpointTick}
                    alt=""
                    aria-hidden
                    draggable="false"
                    className="reg-mini-card__bullet"
                  />
                  <span>{translated}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="reg-mini-card__footer">            <span className="reg-mini-card__price-pill">
            <span className="reg-mini-card__price">{priceNumeric > 0 ? formatPrice(priceNumeric) : '₹999'}</span>
            <span className="reg-mini-card__price-arrow" aria-hidden>
              <ArrowRight size={18} strokeWidth={2.5} />
            </span>
          </span>
        </div>
        </Link>
      </div>
    );
  };

  return (
    <section className="bg-white pt-3 pb-4 md:pt-4 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <header className="home-section-header home-section-header--operations">
          <div className="home-section-header__top">
            <h2 className="home-section-header__title">{t('homeRegistrationsTitle', { defaultValue: 'Registrations' })}</h2>
            <div className="hro-header-right">
              <div className="hro-city-filter-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hro-city-filter-icon">
                  <circle cx="11" cy="11" r="8"/>
                  <path strokeLinecap="round" d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  className="hro-city-filter-input"
                  placeholder={t('regCatalogSearchCategories', { defaultValue: 'Search with Category' })}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                />
                {categoryFilter && (
                  <button
                    type="button"
                    className="hro-city-filter-clear"
                    onClick={() => setCategoryFilter('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <Link to={REGISTRATIONS_PAGE_PATH} className="home-section-header__view-all">
                <span>{t('viewAll', { defaultValue: 'View All' })}</span>
                <ArrowRight className="home-section-header__view-all-icon" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>
        {waitingForCategories ? (
          <div className="reg-cards-row-wrap" aria-busy="true" aria-label="Loading categories">
            <HomePreviewRow className="reg-cards-preview-row">
              {[0, 1, 2, 3, 4].map((key) => (
                <HomePreviewRowItem key={key}>
                  <div className="reg-mini-card-wrapper">
                    <div className="reg-mini-card reg-mini-card--skeleton" />
                  </div>
                </HomePreviewRowItem>
              ))}
            </HomePreviewRow>
          </div>
        ) : filteredCategories.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{t('regCatalogEmpty', { defaultValue: 'No category found. Check back soon, we are working on it.' })}</p>
        ) : (
          <div
            className={[
              'reg-cards-row-wrap',
              canScrollLeft ? 'reg-cards-row-wrap--fade-left' : '',
              canScrollRight ? 'reg-cards-row-wrap--fade-right' : '',
            ].filter(Boolean).join(' ')}
            ref={rowWrapRef}
          >
            <button
              type="button"
              className="reg-cards-nav reg-cards-nav--prev"
              onClick={() => scrollCards(-1)}
              disabled={!canScrollLeft}
              aria-label="Scroll registration cards left"
            >
              <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
            </button>
            <HomePreviewRow className="reg-cards-preview-row">
              {filteredCategories.map((cat) => (
                <HomePreviewRowItem key={cat.slug}>
                  {renderCard(cat)}
                </HomePreviewRowItem>
              ))}
            </HomePreviewRow>
            <button
              type="button"
              className="reg-cards-nav reg-cards-nav--next"
              onClick={() => scrollCards(1)}
              disabled={!canScrollRight}
              aria-label="Scroll registration cards right"
            >
              <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
