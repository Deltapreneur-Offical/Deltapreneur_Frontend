import logoBlack from '../../assets/Cobrother_logo.png';
import logoGreen from '../../assets/Cobrother_logo_Brown.png';
import BrandLogoImage from './BrandLogoImage';

/**
 * CoBrother wordmark — static black by default, green only on hover.
 * Uses static PNG frames (not animated GIFs) so the logo does not auto-animate.
 */
export default function BrandNavLogo({ className = '', imgClassName = 'brand-nav-logo' }) {
  const imgBase = `${imgClassName} home-nav-logo-img`.trim();

  return (
    <span className={`home-nav-logo-swap group h-full ${className}`.trim()}>
      <BrandLogoImage
        src={logoBlack}
        alt="CoBrother"
        loading="eager"
        fetchpriority="high"
        className={`${imgBase} home-nav-logo-img--default !h-full !w-full !max-w-none !object-contain`.trim()}
      />
      <BrandLogoImage
        src={logoGreen}
        aria-hidden
        loading="eager"
        className={`${imgBase} home-nav-logo-img--hover !h-full !w-full !max-w-none !object-contain`.trim()}
      />
    </span>
  );
}
