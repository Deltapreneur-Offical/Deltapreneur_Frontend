import applyBtn from '../../assets/apply-btn.png';
import pitchBtn from '../../assets/pitch-btn.png';
import '../../styles/venture-image-cta.css';

/**
 * Image CTA for venture detail Pitch / Apply as Partner actions.
 * Disabled and already-applied states stay as text so status remains readable.
 */
export default function VentureImageCtaButton({
  kind,
  label,
  disabled = false,
  onClick,
  className = '',
}) {
  const src = kind === 'apply' ? applyBtn : pitchBtn;
  return (
    <button
      type="button"
      className={`venture-image-cta ${className}`.trim()}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={label}
    >
      <img src={src} alt="" className="venture-image-cta__img" draggable="false" />
    </button>
  );
}
