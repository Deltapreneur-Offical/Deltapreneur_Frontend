/**
 * CoBrother wordmark (GIF/PNG). GIF frames animate automatically via <img>.
 */
export default function BrandLogoImage({
  src,
  className = '',
  alt = 'CoBrother',
  'aria-hidden': ariaHidden,
  ...rest
}) {
  return (
    <img
      src={src}
      alt={ariaHidden ? '' : alt}
      aria-hidden={ariaHidden}
      className={className}
      draggable={false}
      decoding="async"
      {...rest}
    />
  );
}
