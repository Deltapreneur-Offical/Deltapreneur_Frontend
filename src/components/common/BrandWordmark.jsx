import coBrotherLogo from '../../assets/Cobrother_logo.png';
import BrandLogoImage from './BrandLogoImage';

export default function BrandWordmark({ inline = false, className = '', alt = 'CoBrother' }) {
  const displayClass = inline ? 'brand-wordmark-inline' : 'block';

  return (
    <BrandLogoImage
      src={coBrotherLogo}
      alt={alt}
      className={`${displayClass} ${className}`.trim()}
    />
  );
}
