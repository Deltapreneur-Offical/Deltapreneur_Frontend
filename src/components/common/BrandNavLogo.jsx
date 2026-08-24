/**
 * HubRegistrar logo — uses official logo image.
 */
import hubregistrarLogo from '../../assets/hubregistrarlogo_main.png';

export default function BrandNavLogo({ className = '', imgClassName = 'brand-nav-logo' }) {
  const base = imgClassName || 'brand-nav-logo';

  return (
    <span className={`home-nav-logo-swap group h-full ${className}`.trim()}>
      <img
        src={hubregistrarLogo}
        alt="HubRegistrar"
        className={`${base} home-nav-logo-img--default`.trim()}
        style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
      />
    </span>
  );
}
