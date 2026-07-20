import logoBlack from '../../assets/Cobrother_logo.gif';
import logoGreen from '../../assets/Cobrother_logo_G.gif';
import BrandLogoImage from './BrandLogoImage';

/**
 * CoBrother wordmark — black by default, green on hover.
 */
export default function BrandNavLogo({ className = '', imgClassName = 'brand-nav-logo' }) {
  const imgBase = `${imgClassName} home-nav-logo-img`.trim();

  return (
    <span className={`home-nav-logo-swap ${className}`.trim()}>
      <BrandLogoImage
        src={logoBlack}
        alt="CoBrother"
        loading="eager"
        fetchPriority="high"
        className={`${imgBase} home-nav-logo-img--default`.trim()}
      />
      <BrandLogoImage
        src={logoGreen}
        aria-hidden
        loading="eager"
        className={`${imgBase} home-nav-logo-img--hover`.trim()}
      />
    </span>
  );
}
