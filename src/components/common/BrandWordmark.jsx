/**
 * Deltapreneur logo — uses official logo image.
 */
import deltapreneurLogo from '../../assets/Deltapreneur_main_logo.png';

export default function BrandWordmark({ inline = false, className = '' }) {
  const displayClass = inline ? 'brand-wordmark-inline' : 'block';

  return (
    <img
      src={deltapreneurLogo}
      alt="Deltapreneur"
      className={`${displayClass} ${className} brand-text-logo`.trim()}
      style={{ height: 'auto', width: 'auto', objectFit: 'contain' }}
    />
  );
}
