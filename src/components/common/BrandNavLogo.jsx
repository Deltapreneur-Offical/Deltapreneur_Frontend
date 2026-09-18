/**
 * Deltapreneur logo — uses official logo image.
 */
import deltapreneurLogo from '../../assets/Deltapreneur_main_logo.png';
import deltapreneurLogo372 from '../../assets/Deltapreneur_main_logo_372w.png';
import deltapreneurLogo576 from '../../assets/Deltapreneur_main_logo_576w.png';
import deltapreneurMobileLogo from '../../assets/Deltapreneur_main_logo_mobile.png';
import deltapreneurMobileLogo240 from '../../assets/Deltapreneur_main_logo_mobile_240w.png';
import deltapreneurMobileLogo360 from '../../assets/Deltapreneur_main_logo_mobile_360w.png';

export default function BrandNavLogo({
  className = '',
  imgClassName = 'brand-nav-logo',
  width = 186,
  height = 46,
  priority = false,
}) {
  const base = imgClassName || 'brand-nav-logo';

  return (
    <span className={`home-nav-logo-swap group h-full ${className}`.trim()}>
      <picture>
        <source
          media="(max-width: 639px)"
          srcSet={`${deltapreneurMobileLogo240} 240w, ${deltapreneurMobileLogo360} 360w, ${deltapreneurMobileLogo} 800w`}
        />
        <img
          src={deltapreneurLogo576}
          srcSet={`${deltapreneurLogo372} 372w, ${deltapreneurLogo576} 576w, ${deltapreneurLogo} 1584w`}
          sizes={`${Math.max(width, 1)}px`}
          alt="Deltapreneur"
          width={width}
          height={height}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          /* React 18 only supports the lowercase native attribute; camelCase
             `fetchPriority` triggers a DOM-prop warning until React 19. */
          {...(priority ? { fetchpriority: 'high' } : {})}
          className={`${base} home-nav-logo-img--default`.trim()}
        />
      </picture>
    </span>
  );
}
