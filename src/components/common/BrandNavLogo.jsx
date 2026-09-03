/**
 * Deltapreneur logo — uses official logo image.
 */
import deltapreneurLogo from '../../assets/Deltapreneur_main_logo.png';

export default function BrandNavLogo({ className = '', imgClassName = 'brand-nav-logo' }) {
  const base = imgClassName || 'brand-nav-logo';

  return (
    <span className={`home-nav-logo-swap group h-full ${className}`.trim()}>
      <img
        src={deltapreneurLogo}
        alt="Deltapreneur"
        className={`${base} home-nav-logo-img--default`.trim()}
      />
    </span>
  );
}
