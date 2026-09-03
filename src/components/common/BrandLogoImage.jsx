/**
 * Deltapreneur logo — uses official logo image.
 */
import deltapreneurLogo from '../../assets/Deltapreneur_main_logo.png';

export default function BrandLogoImage({
  src: _src,
  className = '',
  alt = 'Deltapreneur',
  'aria-hidden': ariaHidden = false,
  ...rest
}) {
  return (
    <img
      src={deltapreneurLogo}
      alt={alt}
      className={className}
      aria-hidden={ariaHidden || undefined}
      {...rest}
    />
  );
}
