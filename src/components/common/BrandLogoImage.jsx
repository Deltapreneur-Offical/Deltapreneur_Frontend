/**
 * HubRegistrar logo — uses official logo image.
 * Renders the brand logo image instead of the old text placeholder.
 */
import hubregistrarLogo from '../../assets/hubregistrarlogo_main.png';

export default function BrandLogoImage({
  src: _src,
  className = '',
  alt = 'HubRegistrar',
  'aria-hidden': ariaHidden = false,
  ...rest
}) {
  return (
    <img
      src={hubregistrarLogo}
      alt={alt}
      className={className}
      aria-hidden={ariaHidden || undefined}
      style={{ height: 'auto', width: 'auto', objectFit: 'contain' }}
      {...rest}
    />
  );
}
